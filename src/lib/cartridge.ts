import { ControllerConnector } from "@cartridge/connector";
import { ESCROW_CONTRACT, STRK_TOKEN, ETH_TOKEN, SEPOLIA_RPC } from "./constants";

const policies = {
  contracts: {
    [STRK_TOKEN]: {
      methods: [
        {
          name: "Approve STRK",
          entrypoint: "approve",
          description: "Approve escrow contract to transfer STRK for wagers",
        },
      ],
    },
    [ETH_TOKEN]: {
      methods: [
        {
          name: "Approve ETH",
          entrypoint: "approve",
          description: "Approve escrow contract to transfer ETH for wagers",
        },
      ],
    },
    ...(ESCROW_CONTRACT !== "0x0" && {
      [ESCROW_CONTRACT]: {
        name: "ZapArena Escrow",
        description: "Game escrow contract for wagers",
        methods: [
          { name: "Create Game", entrypoint: "create_game", description: "Create a new wager game" },
          { name: "Join Game", entrypoint: "join_game", description: "Join an existing wager game" },
          { name: "Cancel Game", entrypoint: "cancel_game", description: "Cancel your open game" },
          { name: "Commit Move", entrypoint: "commit_move", description: "Submit encrypted RPS move" },
          { name: "Reveal Move", entrypoint: "reveal_move", description: "Reveal your RPS move" },
          { name: "Join Prediction", entrypoint: "join_prediction", description: "Join a prediction pool" },
        ],
      },
    }),
  },
};

export const connector = new ControllerConnector({
  policies,
  chains: [{ rpcUrl: SEPOLIA_RPC }],
});
