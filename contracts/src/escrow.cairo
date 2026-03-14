use starknet::ContractAddress;

#[starknet::interface]
pub trait IZapArenaEscrow<TContractState> {
    fn create_game(
        ref self: TContractState,
        game_type: u8,
        wager_token: ContractAddress,
        wager_amount: u256,
    ) -> u64;
    fn join_game(ref self: TContractState, game_id: u64);
    fn resolve_game(ref self: TContractState, game_id: u64, winner: ContractAddress);
    fn cancel_game(ref self: TContractState, game_id: u64);
    // Multiplayer prediction
    fn join_prediction(ref self: TContractState, game_id: u64);
    fn resolve_prediction(ref self: TContractState, game_id: u64, winners: Span<ContractAddress>);
    // Views
    fn get_game_status(self: @TContractState, game_id: u64) -> u8;
    fn get_game_creator(self: @TContractState, game_id: u64) -> ContractAddress;
    fn get_game_wager_amount(self: @TContractState, game_id: u64) -> u256;
    fn get_pool_player_count(self: @TContractState, game_id: u64) -> u64;
    fn get_player_wins(self: @TContractState, player: ContractAddress) -> u64;
    fn get_game_count(self: @TContractState) -> u64;
}

#[starknet::contract]
mod ZapArenaEscrow {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map, StoragePathEntry};
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    const STATUS_OPEN: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_RESOLVED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    // Game types
    const TYPE_COINFLIP: u8 = 0;
    const TYPE_RPS: u8 = 1;
    const TYPE_PREDICTION: u8 = 2;

    #[storage]
    struct Storage {
        owner: ContractAddress,
        next_game_id: u64,
        game_type: Map<u64, u8>,
        game_creator: Map<u64, ContractAddress>,
        game_joiner: Map<u64, ContractAddress>,
        game_wager_token: Map<u64, ContractAddress>,
        game_wager_amount: Map<u64, u256>,
        game_status: Map<u64, u8>,
        game_winner: Map<u64, ContractAddress>,
        // Multiplayer pool: track deposits
        pool_player_count: Map<u64, u64>,
        pool_player_deposited: Map<(u64, ContractAddress), bool>,
        // Leaderboard
        player_wins: Map<ContractAddress, u64>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        GameCreated: GameCreated,
        GameJoined: GameJoined,
        GameResolved: GameResolved,
        GameCancelled: GameCancelled,
        PoolJoined: PoolJoined,
        PredictionResolved: PredictionResolved,
    }

    #[derive(Drop, starknet::Event)]
    pub struct GameCreated {
        pub game_id: u64,
        pub creator: ContractAddress,
        pub game_type: u8,
        pub wager_token: ContractAddress,
        pub wager_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct GameJoined {
        pub game_id: u64,
        pub joiner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct GameResolved {
        pub game_id: u64,
        pub winner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct GameCancelled {
        pub game_id: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PoolJoined {
        pub game_id: u64,
        pub player: ContractAddress,
        pub player_count: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PredictionResolved {
        pub game_id: u64,
        pub winners_count: u64,
        pub payout_per_winner: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.next_game_id.write(1);
    }

    #[abi(embed_v0)]
    impl ZapArenaEscrowImpl of super::IZapArenaEscrow<ContractState> {
        fn create_game(
            ref self: ContractState,
            game_type: u8,
            wager_token: ContractAddress,
            wager_amount: u256,
        ) -> u64 {
            assert(game_type <= 2, 'Invalid game type');
            assert(wager_amount > 0, 'Wager must be > 0');

            let caller = get_caller_address();
            let game_id = self.next_game_id.read();
            self.next_game_id.write(game_id + 1);

            let token = IERC20Dispatcher { contract_address: wager_token };
            token.transfer_from(caller, get_contract_address(), wager_amount);

            self.game_type.entry(game_id).write(game_type);
            self.game_creator.entry(game_id).write(caller);
            self.game_wager_token.entry(game_id).write(wager_token);
            self.game_wager_amount.entry(game_id).write(wager_amount);
            self.game_status.entry(game_id).write(STATUS_OPEN);

            // If prediction game, creator is first pool member
            if game_type == TYPE_PREDICTION {
                self.pool_player_count.entry(game_id).write(1);
                self.pool_player_deposited.entry((game_id, caller)).write(true);
            }

            self.emit(GameCreated { game_id, creator: caller, game_type, wager_token, wager_amount });
            game_id
        }

        fn join_game(ref self: ContractState, game_id: u64) {
            let caller = get_caller_address();
            let status = self.game_status.entry(game_id).read();
            assert(status == STATUS_OPEN, 'Game not open');

            let creator = self.game_creator.entry(game_id).read();
            assert(caller != creator, 'Cannot join own game');

            let wager_token = self.game_wager_token.entry(game_id).read();
            let wager_amount = self.game_wager_amount.entry(game_id).read();

            let token = IERC20Dispatcher { contract_address: wager_token };
            token.transfer_from(caller, get_contract_address(), wager_amount);

            self.game_joiner.entry(game_id).write(caller);
            self.game_status.entry(game_id).write(STATUS_ACTIVE);

            self.emit(GameJoined { game_id, joiner: caller });
        }

        fn resolve_game(ref self: ContractState, game_id: u64, winner: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can resolve');

            let status = self.game_status.entry(game_id).read();
            assert(status == STATUS_ACTIVE, 'Game not active');

            let wager_token = self.game_wager_token.entry(game_id).read();
            let wager_amount = self.game_wager_amount.entry(game_id).read();

            let token = IERC20Dispatcher { contract_address: wager_token };
            token.transfer(winner, wager_amount * 2);

            self.game_status.entry(game_id).write(STATUS_RESOLVED);
            self.game_winner.entry(game_id).write(winner);

            let current_wins = self.player_wins.entry(winner).read();
            self.player_wins.entry(winner).write(current_wins + 1);

            self.emit(GameResolved { game_id, winner });
        }

        fn cancel_game(ref self: ContractState, game_id: u64) {
            let caller = get_caller_address();
            let creator = self.game_creator.entry(game_id).read();
            assert(caller == creator, 'Only creator can cancel');

            let status = self.game_status.entry(game_id).read();
            assert(status == STATUS_OPEN, 'Can only cancel open games');

            let wager_token = self.game_wager_token.entry(game_id).read();
            let wager_amount = self.game_wager_amount.entry(game_id).read();

            let token = IERC20Dispatcher { contract_address: wager_token };
            token.transfer(creator, wager_amount);

            self.game_status.entry(game_id).write(STATUS_CANCELLED);
            self.emit(GameCancelled { game_id });
        }

        // --- Multiplayer Prediction ---

        fn join_prediction(ref self: ContractState, game_id: u64) {
            let caller = get_caller_address();
            let status = self.game_status.entry(game_id).read();
            assert(status == STATUS_OPEN, 'Game not open');

            let game_type = self.game_type.entry(game_id).read();
            assert(game_type == TYPE_PREDICTION, 'Not a prediction game');

            // Check not already deposited
            let already = self.pool_player_deposited.entry((game_id, caller)).read();
            assert(!already, 'Already in pool');

            let wager_token = self.game_wager_token.entry(game_id).read();
            let wager_amount = self.game_wager_amount.entry(game_id).read();

            // Pull wager
            let token = IERC20Dispatcher { contract_address: wager_token };
            token.transfer_from(caller, get_contract_address(), wager_amount);

            // Track deposit
            self.pool_player_deposited.entry((game_id, caller)).write(true);
            let count = self.pool_player_count.entry(game_id).read() + 1;
            self.pool_player_count.entry(game_id).write(count);

            self.emit(PoolJoined { game_id, player: caller, player_count: count });
        }

        fn resolve_prediction(
            ref self: ContractState,
            game_id: u64,
            winners: Span<ContractAddress>,
        ) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can resolve');

            let status = self.game_status.entry(game_id).read();
            assert(status == STATUS_OPEN || status == STATUS_ACTIVE, 'Game already resolved');

            let wager_token = self.game_wager_token.entry(game_id).read();
            let wager_amount = self.game_wager_amount.entry(game_id).read();
            let total_players = self.pool_player_count.entry(game_id).read();
            let winners_count: u64 = winners.len().into();

            assert(winners_count > 0, 'Must have winners');
            assert(winners_count <= total_players, 'More winners than players');

            // Total pool = total_players * wager_amount
            // Each winner gets: total_pool / winners_count
            let total_pool = wager_amount * total_players.into();
            let payout_per_winner = total_pool / winners_count.into();

            let token = IERC20Dispatcher { contract_address: wager_token };

            // Pay each winner
            let mut i: u32 = 0;
            loop {
                if i >= winners.len() {
                    break;
                }
                let winner = *winners.at(i);
                token.transfer(winner, payout_per_winner);

                // Update leaderboard
                let current_wins = self.player_wins.entry(winner).read();
                self.player_wins.entry(winner).write(current_wins + 1);

                i += 1;
            };

            self.game_status.entry(game_id).write(STATUS_RESOLVED);

            self.emit(PredictionResolved { game_id, winners_count, payout_per_winner });
        }

        // --- Views ---

        fn get_game_status(self: @ContractState, game_id: u64) -> u8 {
            self.game_status.entry(game_id).read()
        }

        fn get_game_creator(self: @ContractState, game_id: u64) -> ContractAddress {
            self.game_creator.entry(game_id).read()
        }

        fn get_game_wager_amount(self: @ContractState, game_id: u64) -> u256 {
            self.game_wager_amount.entry(game_id).read()
        }

        fn get_pool_player_count(self: @ContractState, game_id: u64) -> u64 {
            self.pool_player_count.entry(game_id).read()
        }

        fn get_player_wins(self: @ContractState, player: ContractAddress) -> u64 {
            self.player_wins.entry(player).read()
        }

        fn get_game_count(self: @ContractState) -> u64 {
            self.next_game_id.read() - 1
        }
    }
}
