export const ESCROW_CONTRACT = process.env.NEXT_PUBLIC_ESCROW_CONTRACT || "0x0";

export const STRK_TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
export const ETH_TOKEN = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export const TOKEN_ADDRESSES: Record<string, string> = {
  STRK: STRK_TOKEN,
  ETH: ETH_TOKEN,
};

export const TOKEN_DECIMALS: Record<string, number> = {
  STRK: 18,
  ETH: 18,
};

export const SEPOLIA_RPC = "https://api.cartridge.gg/x/starknet/sepolia";

export const ESCROW_ABI = [
  {
    name: "create_game",
    type: "function",
    inputs: [
      { name: "game_type", type: "core::integer::u8" },
      { name: "wager_token", type: "core::starknet::contract_address::ContractAddress" },
      { name: "wager_amount", type: "core::integer::u256" },
    ],
    outputs: [{ type: "core::integer::u64" }],
    state_mutability: "external",
  },
  {
    name: "join_game",
    type: "function",
    inputs: [{ name: "game_id", type: "core::integer::u64" }],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "resolve_game",
    type: "function",
    inputs: [
      { name: "game_id", type: "core::integer::u64" },
      { name: "winner", type: "core::starknet::contract_address::ContractAddress" },
    ],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "cancel_game",
    type: "function",
    inputs: [{ name: "game_id", type: "core::integer::u64" }],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "commit_move",
    type: "function",
    inputs: [
      { name: "game_id", type: "core::integer::u64" },
      { name: "commit_hash", type: "core::felt252" },
    ],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "reveal_move",
    type: "function",
    inputs: [
      { name: "game_id", type: "core::integer::u64" },
      { name: "move_val", type: "core::integer::u8" },
      { name: "salt", type: "core::felt252" },
    ],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "get_game_status",
    type: "function",
    inputs: [{ name: "game_id", type: "core::integer::u64" }],
    outputs: [{ type: "core::integer::u8" }],
    state_mutability: "view",
  },
  {
    name: "get_player_wins",
    type: "function",
    inputs: [{ name: "player", type: "core::starknet::contract_address::ContractAddress" }],
    outputs: [{ type: "core::integer::u64" }],
    state_mutability: "view",
  },
] as const;
