const SOURCIFY_SIGNATURE_DB_REF = {
  label: "Sourcify signature database",
  url: "https://docs.sourcify.dev/docs/repository/signature-database/",
};

const SOURCIFY_4BYTE_API_REF = {
  label: "Sourcify 4byte API",
  url: "https://docs.sourcify.dev/docs/api/#4byte-signature-service-api-documentation",
};

export const BUCKETS = [
  {
    id: "access-control",
    match: [
      /^OnlyOwner$/i,
      /Ownable/i,
      /Unauthori[sz]ed/i,
      /NotAdmin/i,
      /CallerNot/i,
      /^Not(Minter|Operator|Guardian|Authorized|Owner|Controller|Manager|Governor)/i,
      /^AccessControl/i,
      /^Forbidden$/i,
      /PermissionDenied/i,
      /^OnlyRole/i,
      /Role(NotGranted|Missing|Unauthorized)/i,
    ],
    title: ({ name }) => `Access denied: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} usually means the caller lacks the role, owner authority, or delegated permission required for this action.`,
    likelyCauses: [
      "The transaction sender is not the owner, admin, operator, guardian, minter, or role holder checked by the contract.",
      "A proxy, relayer, account abstraction wallet, or multicall changed the effective caller from the address you expected.",
      "Governance or an admin has not granted the permission yet, or the permission was revoked before this call.",
    ],
    nextSteps: [
      "Check the effective msg.sender for the failing call, including proxy, relayer, and delegatecall context.",
      "Read the contract's owner, role registry, operator approval, or permission mapping for the caller address.",
      "Call from the authorized account or have the admin grant the missing role before retrying.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "allowance-approval",
    match: [/InsufficientAllowance/i, /^ERC20InsufficientAllowance$/i, /Allowance(Too)?Low/i, /ApprovalRequired/i, /^NotApproved$/i, /NotOperatorApproved/i, /InsufficientApproval/i],
    title: ({ name }) => `Missing approval: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} points to an allowance or approval gate rather than an execution or gas problem.`,
    likelyCauses: [
      "The spender does not have enough ERC-20 allowance for the requested transfer or pull.",
      "The NFT or multi-token operator approval is missing for the token being moved.",
      "The transaction routes through a router, vault, or permit helper whose address differs from the spender you approved.",
    ],
    nextSteps: [
      "Compare the approved spender address with the contract that actually calls transferFrom or operator transfer.",
      "Increase allowance, submit the required permit, or set operator approval for the exact token collection.",
      "If a router is involved, approve the router or permit contract, not only the final pool or vault.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "arg-validation",
    match: [
      /ZeroAddress|NullAddress|InvalidAddress/i,
      /ZeroAmount|InvalidAmount|AmountZero/i,
      /InvalidLength|LengthMismatch|ArrayLength|EmptyArray/i,
      /OutOfBounds|IndexOutOfRange|InvalidIndex/i,
      /InvalidArgument|BadInput|Malformed(Request|Input)|InvalidParameter/i,
      /InvalidRecipient|InvalidSender|InvalidReceiver|InvalidToken/i,
    ],
    title: ({ name }) => `Invalid input: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates the transaction arguments fail a local validation check before the intended state change can run.`,
    likelyCauses: [
      "An address, amount, index, array length, token id, or encoded payload has an invalid value.",
      "Parallel arrays have different lengths, or an empty collection was supplied where at least one item is required.",
      "A zero value was passed to a function that requires an initialized address, positive amount, or non-empty payload.",
    ],
    nextSteps: [
      "Decode the custom error arguments and map them back to the submitted calldata fields.",
      "Validate addresses, amounts, indexes, array lengths, and payload encoding before submitting the transaction.",
      "Use the contract ABI or source to find the require/revert branch with this error name.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "auction-order",
    match: [/Order(Filled|Canceled|Cancelled|Expired|NotFillable|AlreadyFilled|AlreadyCancelled)/i, /BidTooLow|ReserveNotMet/i, /Auction(NotStarted|Ended|Closed|Settled)/i, /^Settled$/i],
    title: ({ name }) => `Order or auction rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} usually comes from orderbook, auction, or settlement state that no longer accepts this fill or bid.`,
    likelyCauses: [
      "The order was already filled, cancelled, expired, or otherwise marked not fillable.",
      "The bid, fill amount, or reserve price is below the auction or order constraints.",
      "The auction is outside its active window or has already been settled.",
    ],
    nextSteps: [
      "Refresh the order or auction state immediately before signing or submitting the fill transaction.",
      "Check the order hash, nonce, deadline, fill amount, reserve price, and cancellation status.",
      "Create a new order or bid with current pricing if the old one is no longer live.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "balance-funds",
    match: [/Insufficient(Balance|Funds|Reserve|Liquidity|Collateral)/i, /^NotEnough/i, /Balance(Too)?Low/i, /Underfunded/i, /NothingToWithdraw/i, /EmptyVault/i, /InsufficientValue/i],
    title: ({ name }) => `Insufficient balance or liquidity: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates the account, vault, pool, or reserve does not hold enough usable funds for the requested operation.`,
    likelyCauses: [
      "The sender's token, native balance, collateral, or internal accounting balance is below the requested amount.",
      "The pool, reserve, vault, or escrow does not have enough available liquidity for this action.",
      "Fees, slippage, debt, or pending withdrawals reduce the spendable amount below the visible balance.",
    ],
    nextSteps: [
      "Check token balance, native balance, internal vault balance, and outstanding debt at the same block as the revert.",
      "Reduce the requested amount or add funds, collateral, or liquidity before retrying.",
      "Account for protocol fees and pending state changes when computing the spendable amount.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "bridge-cross-chain",
    match: [/Message(AlreadyProcessed|NotReady|Failed|TooLarge|Invalid|Expired)/i, /WrongDestinationChain|WrongSourceChain|RemoteCaller/i, /Bridge|CrossChain|XChain/i, /Layer(Zero|0)|Axelar|CCIP|Wormhole|Hyperlane|Stargate|Teleporter|CCTP/i],
    title: ({ name }) => `Bridge or cross-chain message rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} is shaped like a bridge, messaging, or cross-chain domain failure.`,
    likelyCauses: [
      "The message proof, source chain, destination chain, remote sender, nonce, or replay guard does not match the bridge's expected state.",
      "The message has not reached the executable state yet, or it was already processed on the destination chain.",
      "The adapter or endpoint configuration points at the wrong remote contract or chain id.",
    ],
    nextSteps: [
      "Check the source chain id, destination chain id, message nonce, bridge endpoint, and trusted remote configuration.",
      "Confirm the message is finalized and available on the destination before executing it.",
      "If it was already processed, stop retrying that message and reconcile the destination-chain state.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "chain-domain-mismatch",
    match: [/WrongChainId|InvalidChainId|UnsupportedChain/i, /InvalidDomain|DomainSeparatorMismatch|WrongDomain|ChainIdMismatch/i],
    title: ({ name }) => `Wrong chain or domain: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} usually means a signature, order, message, or config was built for a different chain or domain separator.`,
    likelyCauses: [
      "The signed payload uses a chain id, verifying contract, salt, or domain separator that differs from the executing contract.",
      "The transaction is being submitted on an unsupported network or fork.",
      "Frontend or backend cached domain data from a previous deployment, chain, or proxy address.",
    ],
    nextSteps: [
      "Rebuild signatures and typed data using the current chain id, verifying contract, name, version, and salt.",
      "Confirm the connected wallet, RPC URL, and deployed contract address are on the intended network.",
      "Reject stale cached quotes, permits, or orders created for another chain.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "deadline-expiry",
    match: [/Deadline|Expired|TooLate|TimelockNotReady|NotYetExecutable|BeforeStart|AfterEnd|WindowClosed|OrderExpired|SaleEnded|SaleNotStarted/i],
    title: ({ name }) => `Deadline or time window failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates the current block timestamp or protocol delay is outside the allowed execution window.`,
    likelyCauses: [
      "The transaction arrived after its deadline, order expiry, auction end, or claim window.",
      "The transaction arrived before a start time, timelock, cooldown, vesting cliff, or executable timestamp.",
      "The client used stale off-chain timing data while the chain timestamp advanced.",
    ],
    nextSteps: [
      "Compare the deadline, start time, end time, timelock, or expiry argument with the block timestamp.",
      "Refresh the quote, order, permit, or action after fetching the latest chain state.",
      "Wait until the timelock or start timestamp is reached, or create a new transaction with a valid deadline.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "domain-resolver",
    match: [/Unauthori[sz]edResolver|LabelHashMismatch|NameNotRegistered|NotResolver|RecordNotFound|ResolverNotFound|InvalidResolver/i],
    title: ({ name }) => `Name or resolver lookup failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} points to ENS-style name ownership, resolver, labelhash, or record lookup state.`,
    likelyCauses: [
      "The name is not registered, the resolver is not set, or the requested record is absent.",
      "The caller is not authorized to update the resolver or record.",
      "The labelhash, namehash, node, or resolver address was computed for a different name.",
    ],
    nextSteps: [
      "Verify the namehash, labelhash, resolver address, and record key against the registry.",
      "Check ownership or controller rights before attempting resolver or record updates.",
      "Set the resolver or required record first if the lookup path is empty.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "epoch-snapshot",
    match: [/Epoch(NotEnded|AlreadyClaimed|NotStarted|Closed)/i, /Snapshot(Missing|NotReady|Unavailable)/i, /CheckpointNot(Recorded|Ready)|CheckpointMissing/i],
    title: ({ name }) => `Epoch or snapshot unavailable: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} usually means rewards, votes, balances, or claims depend on an epoch, snapshot, or checkpoint that is not in the expected state.`,
    likelyCauses: [
      "The epoch has not ended, has not started, or was already claimed for this account.",
      "The contract has not recorded the snapshot or checkpoint needed for the requested calculation.",
      "The client is querying a period id that does not line up with the protocol's current epoch.",
    ],
    nextSteps: [
      "Read the current epoch, snapshot id, checkpoint status, and claimed bitmap before submitting.",
      "Wait for the epoch finalization or checkpoint transaction if the data is not ready.",
      "Use the exact epoch or snapshot id expected by the claim, vote, or accounting function.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "fees-royalty",
    match: [/FeeTooHigh|MaxFeeExceeded|FeeExceeded|InvalidFee/i, /RoyaltyExceedsMax|RoyaltyTooHigh|BadFeeReceiver|InvalidFeeReceiver|SplitInvalid/i],
    title: ({ name }) => `Fee or royalty rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates a fee, royalty, split, or fee-recipient value exceeds the contract's accepted bounds.`,
    likelyCauses: [
      "A protocol fee, royalty percentage, marketplace fee, or split share is above the configured maximum.",
      "The fee recipient, royalty recipient, or split receiver is invalid or missing.",
      "Fee math produces a total greater than 100 percent or greater than the amount being distributed.",
    ],
    nextSteps: [
      "Inspect fee bps, royalty bps, split shares, and recipient addresses in the submitted parameters.",
      "Clamp fees to the contract maximum and ensure split totals match the expected denominator.",
      "Use an initialized fee or royalty receiver address before retrying.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "gas",
    match: [/OutOfGas|InsufficientGas|GasLimitTooLow|CallDepthExceeded|NotEnoughGas|GasTooLow/i],
    title: ({ name }) => `Gas limit rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates the contract is explicitly checking available gas, callback gas, or call depth.`,
    likelyCauses: [
      "A callback, bridge message, hook, or low-level call was configured with too little gas.",
      "The contract requires a minimum gas reserve before making an external call.",
      "The transaction hit a call-depth or gas-forwarding guard inside the protocol.",
    ],
    nextSteps: [
      "Increase the callback, execution, or message gas limit field used by the protocol.",
      "Check whether a relayer, bundler, or bridge adapter enforces a separate gas limit from the transaction gas.",
      "If the error is call-depth related, simplify the call path instead of only raising gas.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "yes",
    confidence: "medium",
  },
  {
    id: "governance-voting",
    match: [/ProposalNot(Active|Queued|Executable|Succeeded|Pending|Defeated)/i, /AlreadyVoted|VotingPeriodEnded|VotingClosed|QuorumNotReached|BadVoteType|GovernorOnly|VoteNotFound|InvalidProposal/i],
    title: ({ name }) => `Governance action rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} belongs to proposal, vote, quorum, queue, or execution state in a governance system.`,
    likelyCauses: [
      "The proposal is not in the lifecycle state required for this action.",
      "The voter already voted, lacks voting weight, or used an unsupported vote type.",
      "Quorum, delay, timelock, or queue requirements have not been satisfied.",
    ],
    nextSteps: [
      "Read the proposal state, voting window, quorum, voting weight, and timelock status.",
      "Submit the action only during the correct proposal phase.",
      "If voting, check prior receipts and delegate voting power before retrying.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "lending-collateral",
    match: [/Undercollateralized|HealthFactor|Insolvent|LiquidationThreshold|BorrowCap|SupplyCap|DebtCeiling|BadDebt|LTV|Collateral/i],
    title: ({ name }) => `Lending collateral check failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} points to lending-market collateral, debt, cap, or solvency constraints.`,
    likelyCauses: [
      "The account would become undercollateralized after the borrow, withdraw, transfer, or collateral change.",
      "The market borrow cap, supply cap, debt ceiling, or collateral factor blocks the requested amount.",
      "Oracle prices or interest accrual changed the health factor before execution.",
    ],
    nextSteps: [
      "Recompute health factor, LTV, collateral value, debt, and market caps at the latest block.",
      "Repay debt, add collateral, reduce the requested amount, or choose a market with available cap.",
      "Check oracle freshness before trusting off-chain collateral simulations.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "liquidation",
    match: [/NotLiquidatable|LiquidationFailed|CloseFactor|LiquidatorOnly|SeizeAmount|Healthy|CannotLiquidate|LiquidationNotAllowed/i],
    title: ({ name }) => `Liquidation rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates a liquidation path rejected the account, repay amount, collateral, or liquidator.`,
    likelyCauses: [
      "The target account is still healthy or no longer meets the protocol's liquidation threshold.",
      "The repay amount, close factor, seized collateral, or liquidation incentive is outside allowed bounds.",
      "The caller is not an authorized liquidator for this market or phase.",
    ],
    nextSteps: [
      "Recheck health factor, oracle prices, debt, collateral, close factor, and liquidation bonus at the latest block.",
      "Adjust repay amount and collateral selection to the protocol's liquidation math.",
      "Confirm the caller has any required liquidator role or auction permission.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "math",
    match: [/Overflow|Underflow|Div(By)?Zero|DivisionByZero|SafeCast|Math|PRBMath|MulDivFailed|RoundingError|Arithmetic/i],
    title: ({ name }) => `Math invariant failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} points to arithmetic bounds, casting, division, rounding, or fixed-point math constraints.`,
    likelyCauses: [
      "An input or intermediate value overflows, underflows, cannot be safely cast, or divides by zero.",
      "Fixed-point math, multiplication/division, or rounding constraints cannot represent the requested result.",
      "The transaction supplied an amount, price, tick, share, or ratio outside the valid numeric range.",
    ],
    nextSteps: [
      "Decode the error arguments and inspect the amount, denominator, price, tick, share, or cast target.",
      "Clamp inputs to the documented numeric range and guard against zero denominators.",
      "Re-run the calculation with the same integer precision used by the contract.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "merkle-proof",
    match: [/BadMerkleProof|MerkleProofInvalid|Merkle|LeafNotFound|RootMismatch|InvalidProof/i],
    title: ({ name }) => `Merkle proof rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates a Merkle proof, leaf, root, or claim set does not verify against the contract state.`,
    likelyCauses: [
      "The proof was generated for a different root, leaf encoding, address, amount, index, or chain.",
      "The root was updated or disabled after the proof was generated.",
      "The leaf was already claimed or is not part of the active distribution tree.",
    ],
    nextSteps: [
      "Recompute the leaf exactly as the contract does, including address casing, index, amount, and ABI encoding.",
      "Fetch the active root from the contract and regenerate the proof from that distribution data.",
      "Check claim state before resubmitting the same proof.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "module-hook-plugin",
    match: [/Module(NotInstalled|AlreadyInstalled|NotEnabled|Missing|Disabled)/i, /Hook(Reverted|NotPermitted|Missing|Invalid)/i, /Plugin|Validator(NotInstalled|Reverted|Missing|Invalid)/i],
    title: ({ name }) => `Module, hook, or plugin rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} points to a modular account, hook, plugin, validator, or extension configuration problem.`,
    likelyCauses: [
      "The module, hook, plugin, validator, or executor is not installed or not enabled for this account.",
      "The extension reverted while validating or executing the requested action.",
      "The requested selector, hook phase, or module type is not permitted by the current account configuration.",
    ],
    nextSteps: [
      "List installed modules, hooks, plugins, validators, and permissions for the account.",
      "Install or enable the required module before invoking selectors that depend on it.",
      "Inspect the module's own revert data if this error wraps a hook or validator failure.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "nonce-replay",
    match: [/InvalidNonce|Nonce(Used|Mismatch|Expired|TooLow|TooHigh)|ReplayDetected|DuplicateRequest|AlreadyExecuted/i],
    title: ({ name }) => `Nonce or replay guard failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates the transaction, permit, message, or request nonce is not the next unused value expected by the contract.`,
    likelyCauses: [
      "The nonce was already consumed by an earlier transaction, fill, permit, or cross-chain message.",
      "The client signed with a stale nonce or the wrong nonce namespace.",
      "A replay protection bitmap, salt, order hash, or request id already marks this action used.",
    ],
    nextSteps: [
      "Read the current nonce or replay bitmap for the signer, account, channel, or order namespace.",
      "Re-sign with the current nonce, salt, or request id and discard stale signatures.",
      "Do not resubmit already executed messages or orders unless the protocol exposes a new nonce.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "oracle-feed",
    match: [/Stale(Price|Data|Round)?|Oracle(NotSet|NotReady|Unauthorized|Invalid|Stale)|PriceFeed|RoundNotComplete|AnswerTooLow|AnswerTooHigh|ChainlinkFeed|Pyth(Error|Price)|Redstone/i],
    title: ({ name }) => `Oracle or feed rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} points to stale, missing, unauthorized, or out-of-bounds oracle data.`,
    likelyCauses: [
      "The price feed is stale, incomplete, unset, paused, or outside the accepted confidence bounds.",
      "The oracle adapter is not authorized for this market or asset.",
      "The submitted update data, round id, or feed address does not match the configured asset.",
    ],
    nextSteps: [
      "Check feed address, latest round, timestamp, answer, confidence interval, and heartbeat settings.",
      "Submit the required oracle update payload before the state-changing action if the protocol requires one.",
      "Confirm the market uses the oracle source you are reading off-chain.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "pause-emergency",
    match: [/^Paused$|EnforcedPaused|WheneverPaused|ExpectedPause|Halted|EmergencyShutdown|CircuitBreaker|Frozen|Disabled|KillSwitch|Shutdown/i],
    title: ({ name }) => `Paused or emergency mode: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} means the protocol, market, token, or function is paused, frozen, disabled, or in emergency shutdown.`,
    likelyCauses: [
      "A guardian, admin, or circuit breaker paused this function or market.",
      "The token, account, pool, or vault is frozen or disabled by risk controls.",
      "The protocol entered emergency shutdown and only restricted exits or admin actions are allowed.",
    ],
    nextSteps: [
      "Read the protocol pause, frozen, disabled, or emergency flags for the exact function or market.",
      "Use any allowed emergency withdrawal or exit path instead of the paused action.",
      "Wait for governance or the guardian to unpause before retrying normal operations.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "proxy-init",
    match: [/^AlreadyInitialized$|^NotInitialized$|Initializable|ImplementationNotSet|UUPS|Upgrade(NotAllowed|Unauthorized|Failed)|BeaconNotSet|ProxyDeniedAdminAccess|InvalidImplementation/i],
    title: ({ name }) => `Proxy or initialization check failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} belongs to proxy, implementation, upgrade, beacon, or initializer lifecycle checks.`,
    likelyCauses: [
      "The initializer has already run, or a required initializer has not run yet.",
      "The proxy implementation, beacon, admin, or UUPS authorization check is not configured for this upgrade.",
      "The caller is trying to access implementation-only or admin-only behavior through the wrong address.",
    ],
    nextSteps: [
      "Check proxy admin, implementation address, beacon address, initialized version, and upgrade authorization.",
      "Call initialization exactly once through the intended proxy path.",
      "Use the proxy admin or governance upgrade flow instead of calling implementation internals directly.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "rate-limit-cap",
    match: [/Cap(Exceeded|Reached)|RateLimit|MaxSupplyReached|MintLimitReached|DailyLimit|ThrottleActive|TooManyRequests/i],
    title: ({ name }) => `Cap or rate limit reached: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates a hard cap, mint limit, daily limit, rate limit, or throttle blocked the action.`,
    likelyCauses: [
      "The requested mint, transfer, borrow, bridge, or withdrawal exceeds a configured per-user or global cap.",
      "A time-bucketed rate limit or daily limit has already been consumed.",
      "The action would exceed max supply, market capacity, or protocol throughput limits.",
    ],
    nextSteps: [
      "Read the current cap, consumed amount, remaining allowance, reset time, and max supply.",
      "Reduce the amount or wait for the limit window to reset.",
      "Split actions only if the protocol's limit is per-transaction rather than per-window or global.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "refund-claim",
    match: [/Already(Claimed|Refunded)|NothingToClaim|NoClaim|RefundFailed|Claim(Window)?Closed|ClaimNotOpen|NotClaimable/i],
    title: ({ name }) => `Claim or refund rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates a claim, refund, rebate, or distribution cannot be paid for this account and period.`,
    likelyCauses: [
      "The account already claimed or was already refunded for this id, epoch, or allocation.",
      "There is no claimable amount for the account, proof, or distribution window.",
      "The claim window is closed or the refund transfer failed.",
    ],
    nextSteps: [
      "Check claimed state, allocation amount, claim window, proof, and payment token balance.",
      "Do not retry an already claimed id; reconcile the previous claim transaction instead.",
      "If a transfer failed, check recipient behavior and token transfer restrictions.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "reentrancy",
    match: [/Reentrant|ReentrancyGuardReentrantCall|LockedFor|NonReentrant|AlreadyLocked|LockActive/i],
    title: ({ name }) => `Reentrancy or lock guard: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates the contract's reentrancy guard, lock, or transient execution latch is already active.`,
    likelyCauses: [
      "The call path attempted to re-enter a protected function before the previous execution completed.",
      "A pool, vault, hook, or router lock is active for this operation or caller.",
      "A callback tried to invoke a function that is forbidden during settlement.",
    ],
    nextSteps: [
      "Inspect callbacks, hooks, token receiver functions, and multicall ordering for re-entry into the same contract.",
      "Avoid calling locked functions from inside protocol callbacks.",
      "Split the workflow into separate transactions if the protocol requires lock release between phases.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "session-permissions",
    match: [/Session(Expired|Invalid|Revoked)|Permission(Denied|Expired)|SelectorNotPermitted|SpendingLimitExceeded|EIP7702|Authorization(Invalid|Expired|Revoked)|PolicyViolation/i],
    title: ({ name }) => `Session permission rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} points to session-key, authorization, selector, policy, or spending-limit constraints.`,
    likelyCauses: [
      "A session key or delegated authorization is expired, revoked, or not valid for the target selector.",
      "The requested spend, token, recipient, or call target exceeds the session policy.",
      "The authorization payload was signed for a different account, chain, or validity window.",
    ],
    nextSteps: [
      "Inspect session validity, allowed selectors, spend limits, target allowlists, and revocation state.",
      "Reissue the session or authorization with the exact selector and target contract needed.",
      "Route the transaction through the owner account if the delegated key cannot satisfy policy.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "signature-712",
    match: [/InvalidSignature|BadSig|SignatureExpired|WrongSigner|BadV|MalformedSignature|ECDSA(InvalidSignature|InvalidSignatureLength)|EIP712|Permit.*Signature|SignerMismatch/i],
    title: ({ name }) => `Signature validation failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates an ECDSA, EIP-712, permit, signer, or signature-expiry validation failure.`,
    likelyCauses: [
      "The signature was produced by a different signer than the contract expects.",
      "The typed-data domain, struct fields, nonce, deadline, or verifying contract differs from what was signed.",
      "The signature is malformed, expired, uses an unsupported v value, or was altered during transport.",
    ],
    nextSteps: [
      "Recover the signer off-chain from the exact digest the contract verifies and compare it to the expected owner.",
      "Rebuild typed data with the current chain id, verifying contract, nonce, and deadline.",
      "Ask the user or signing service to sign a fresh payload rather than replaying a cached signature.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "slippage-price",
    match: [/Slippage|PriceToo(High|Low)|InsufficientOutputAmount|Min(Return|Out)NotMet|BadPrice|OutsideTolerance|ExcessiveImpact|SqrtPriceLimit|PriceLimitReached|LimitReached/i],
    title: ({ name }) => `Price or slippage bound failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} means execution would violate a price, minimum-output, maximum-input, or slippage constraint.`,
    likelyCauses: [
      "Pool price moved after quote creation, so the output is below minOut or input is above maxIn.",
      "The trade route, tick limit, sqrt price limit, or price-impact guard rejects the requested swap.",
      "Token decimals, fee-on-transfer behavior, or stale quote data made the client compute the wrong bound.",
    ],
    nextSteps: [
      "Refresh the quote and compare expected input/output against the transaction's minOut, maxIn, or price limit.",
      "Widen slippage only if the user accepts the worse execution price.",
      "Check token decimals, transfer fees, pool liquidity, and route ordering before retrying.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "staking-rewards",
    match: [/CooldownActive|Unstake|LockNotExpired|RewardsClaimed|NoRewards|StakeBelowMin|EpochNotEnded|Reward(NotReady|TooSoon)|WithdrawalDelay/i],
    title: ({ name }) => `Staking or rewards rejected: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} usually belongs to staking, unstaking, cooldown, lockup, reward, or epoch timing logic.`,
    likelyCauses: [
      "The stake is still locked, cooling down, or below a minimum amount.",
      "Rewards for the account or epoch are already claimed, not accrued yet, or not finalized.",
      "The withdrawal delay, epoch boundary, or reward distribution window has not been reached.",
    ],
    nextSteps: [
      "Read stake amount, lock expiry, cooldown end, reward accrual, and claimed state.",
      "Wait for the unlock, cooldown, withdrawal delay, or epoch finalization before retrying.",
      "Use the protocol's exit or claim function for the correct staking position id.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "state-machine",
    match: [/WrongState|BadState|NotInState|AlreadyClosed|AlreadyOpen|NotStarted|NotEnded|LifecycleViolation|InvalidState|StateMismatch/i],
    title: ({ name }) => `Wrong protocol state: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates the contract's lifecycle or state machine is not in the phase required for this call.`,
    likelyCauses: [
      "The object, market, auction, vault, game, proposal, or request is in a different state than the function requires.",
      "The action was already completed, closed, opened, started, ended, or settled.",
      "A required prior transition has not executed yet.",
    ],
    nextSteps: [
      "Read the on-chain state enum or lifecycle flags for the object id involved in the call.",
      "Execute missing prerequisite transitions before this action, or stop if the terminal state is already reached.",
      "Refresh local state immediately before constructing state-dependent transactions.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "swap-pool",
    match: [/K_Invariant|TickOutOf|Pool(NotInitialized|Locked)|InvalidTickSpacing|Liquidity(Net|Gross|TooLow)|SwapAmountCannotBeZero|InvalidTick|NoLiquidity|PoolAlreadyInitialized/i],
    title: ({ name }) => `Swap or pool invariant failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} is shaped like an AMM pool, tick, liquidity, or swap invariant failure.`,
    likelyCauses: [
      "The pool is not initialized, has no usable liquidity, or is currently locked for another operation.",
      "Tick, tick spacing, price limit, liquidity delta, or invariant math rejects the requested swap or position update.",
      "The swap amount is zero or route parameters are incompatible with the pool configuration.",
    ],
    nextSteps: [
      "Read pool initialization state, current tick, tick spacing, liquidity, and lock status.",
      "Validate tick bounds, liquidity amount, swap amount, and price limit against the pool's rules.",
      "Use a fresh quote from the current pool state before retrying.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "token-erc4626",
    match: [/ERC4626|ExceededMax(Deposit|Mint|Withdraw|Redeem)|ERC4626Exceeded(Max)?(Deposit|Mint|Withdraw|Redeem)|Max(Deposit|Mint|Withdraw|Redeem)/i],
    title: ({ name }) => `Vault asset or share limit failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} points to ERC-4626-style vault limits, share conversion, asset mismatch, or max deposit/withdraw constraints.`,
    likelyCauses: [
      "The requested deposit, mint, withdraw, or redeem exceeds the vault's current maximum.",
      "Asset-to-share conversion produced zero shares, too many shares, or a value outside rounding limits.",
      "The asset, receiver, owner, or vault state does not match the requested vault operation.",
    ],
    nextSteps: [
      "Call maxDeposit, maxMint, maxWithdraw, or maxRedeem for the account at the latest block.",
      "Preview the vault conversion and account for rounding before submitting.",
      "Check that the asset token and vault address match the intended market.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "transfer-restriction",
    match: [/TransferRestricted|LockUpActive|NonTransferable|SoulboundTransfer|Frozen(Token|Account)|TransferNotAllowed|BlockedTransfer/i],
    title: ({ name }) => `Transfer restricted: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} means token movement is blocked by lockup, soulbound, freeze, transfer-list, or compliance rules.`,
    likelyCauses: [
      "The token or account is locked, frozen, soulbound, non-transferable, or blocked by transfer policy.",
      "A vesting, cooldown, or lockup period has not expired.",
      "Sender, receiver, or token id is not allowed by the token's compliance module.",
    ],
    nextSteps: [
      "Check transfer restrictions, lock expiry, frozen status, and allowlist or blocklist state for both parties.",
      "Wait for lockup expiry or use an authorized transfer path if the token supports one.",
      "Do not treat this as a gas issue; the transfer inputs or account status must change.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "vault-share",
    match: [/MaxSharesExceeded|ZeroShares|ShareConversion|AssetMismatch|InvalidShares|InsufficientShares|SharesTooLow/i],
    title: ({ name }) => `Vault share calculation failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates vault share accounting, asset/share conversion, or share-amount constraints rejected the operation.`,
    likelyCauses: [
      "The asset amount converts to zero shares or more shares than the vault allows.",
      "The caller does not own enough shares for the requested redemption or withdrawal.",
      "The asset used in the transaction does not match the vault's accounting asset.",
    ],
    nextSteps: [
      "Preview asset-to-share and share-to-asset conversion using the vault's current exchange rate.",
      "Check share balance, allowance, and max redeem or withdraw values for the owner.",
      "Use the vault's configured asset token and account for rounding.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  {
    id: "whitelist-allowlist",
    match: [/NotWhitelisted|NotAllowlisted|Blacklisted|AddressBlocked|KYCRequired|RegionBlocked|Allowlist|Whitelist|Blocklist|Denylist/i],
    title: ({ name }) => `Allowlist or compliance check failed: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error ${name} indicates an address, region, KYC, allowlist, blocklist, or compliance rule rejected the call.`,
    likelyCauses: [
      "The sender, receiver, beneficiary, or operator is not on the allowlist or is on a blocklist.",
      "The account has not completed KYC or is blocked by jurisdiction or compliance policy.",
      "The protocol's compliance oracle or registry has not been updated for this address.",
    ],
    nextSteps: [
      "Check allowlist, blocklist, KYC, region, and compliance-registry state for every address in the call.",
      "Use an approved address or complete the required onboarding before retrying.",
      "If the registry is stale, wait for the protocol's compliance update transaction.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
  },
  {
    id: "unclassified",
    match: [/.*/],
    title: ({ name }) => `Sourcify custom error: ${name}`,
    summary: ({ name }) => `Sourcify links ${name} to verified deployed code, but the name is not specific enough for a stronger category in this catalog.`,
    likelyCauses: [
      "The selector matches a verified-contract custom error name, but the name does not reveal a stable protocol-level meaning.",
      "The emitting contract's ABI or source is needed to distinguish this error from similarly named conditions.",
    ],
    nextSteps: [
      "Prefer a protocol-specific catalog entry if one exists for the same selector.",
      "Decode the custom error arguments and inspect the emitting contract source around this error name.",
      "Use the Sourcify repository link or ABI attribution, when present, to confirm the contract-specific semantics.",
    ],
    retryHelpful: "unknown",
    increasingGasHelpful: "unknown",
    confidence: "low",
  },
];

export const BUCKET_IDS = BUCKETS.map((bucket) => bucket.id);

const BUCKET_BY_ID = new Map(BUCKETS.map((bucket) => [bucket.id, bucket]));

export function getBucket(id) {
  const bucket = BUCKET_BY_ID.get(id);
  if (!bucket) throw new Error(`Unknown Sourcify bucket: ${id}`);
  return bucket;
}

export function classifySignature(signature) {
  const name = signatureName(signature);
  const haystack = `${name} ${splitIdentifier(name).join(" ")} ${signature}`;
  return BUCKETS.find((bucket) => bucket.match.some((pattern) => pattern.test(name) || pattern.test(haystack))) ?? getBucket("unclassified");
}

export function renderSourcifyEntry({ signature, selector, attributions = [], bucket = classifySignature(signature) }) {
  const name = signatureName(signature);
  const attributionList = normalizeAttributions(attributions).slice(0, 5);
  const confidence = confidenceFor(bucket, attributionList);
  const references = uniqueReferences([
    SOURCIFY_SIGNATURE_DB_REF,
    SOURCIFY_4BYTE_API_REF,
    ...attributionList.map((attribution) => ({
      label: attribution.contractName
        ? `Sourcify: ${attribution.contractName} on ${attribution.chain}`
        : `Sourcify contract on ${attribution.chain}`,
      url: attribution.repoUrl,
    })),
  ]);

  return {
    id: `sourcify-signatures-${bucket.id}-${slugWords(signature)}-${selector.slice(2).toLowerCase()}`,
    title: bucket.title({ name, signature, selector, attributions: attributionList }),
    layer: "protocol",
    source: "sourcify-signatures",
    category: "custom_error",
    patterns: [{ type: "selector", value: selector.toLowerCase() }],
    summary: bucket.summary({ name, signature, selector, attributions: attributionList }),
    rootCauseKnown: bucket.id !== "unclassified",
    likelyCauses: bucket.likelyCauses,
    nextSteps: bucket.nextSteps,
    retryHelpful: bucket.retryHelpful,
    increasingGasHelpful: bucket.increasingGasHelpful,
    confidence,
    references,
    examples: examplesFor({ signature, selector, attributions: attributionList }),
  };
}

export function signatureName(signature) {
  const index = signature.indexOf("(");
  return index === -1 ? signature : signature.slice(0, index);
}

export function isErrorLikeSignature(signature) {
  const match = signature.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\((.*)\)$/);
  if (!match) return false;
  if (signature.length > 220) return false;
  const name = match[1];
  if (/^(Transfer|Approval|Deposit|Withdraw|Mint|Burn|Swap|Sync|Initialized|OwnershipTransferred)$/.test(name)) return false;
  if (/^[A-Z]/.test(name)) return true;

  return /(?:access|allowance|already|amount|auth|balance|blacklist|cap|cannot|claim|deadline|denied|disabled|empty|error|exceed|expired|fail|forbidden|frozen|insufficient|invalid|kyc|limit|max|min|mismatch|missing|nonce|not|only|overflow|owner|paused|permit|range|reentrant|revert|role|signature|slippage|stale|unauthori[sz]ed|underflow|unsupported|wrong|zero)/i.test(name);
}

export function slugWords(value) {
  const slug = value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 96)
    .replace(/-+$/g, "");
  return slug || "unnamed";
}

function splitIdentifier(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function confidenceFor(bucket, attributions) {
  if (bucket.id === "unclassified") return "low";
  if (attributions.length > 0 && bucket.confidence === "medium") return "high";
  if (attributions.length > 0 && bucket.confidence === "low") return "medium";
  return bucket.confidence;
}

function normalizeAttributions(attributions) {
  const out = [];
  const seen = new Set();
  for (const attribution of attributions ?? []) {
    if (!attribution || typeof attribution !== "object") continue;
    const chain = String(attribution.chain ?? attribution.chainId ?? "").trim();
    const address = String(attribution.address ?? "").trim();
    const repoUrl = String(attribution.repoUrl ?? "").trim();
    if (!chain || !address || !repoUrl) continue;
    const key = `${chain}:${address.toLowerCase()}:${repoUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      chain,
      address,
      contractName: String(attribution.contractName ?? "").trim(),
      protocol: String(attribution.protocol ?? "").trim(),
      repoUrl,
    });
  }
  return out;
}

function uniqueReferences(references) {
  const out = [];
  const seen = new Set();
  for (const reference of references) {
    if (!reference.url || seen.has(reference.url)) continue;
    seen.add(reference.url);
    out.push(reference);
  }
  return out;
}

function examplesFor({ signature, selector, attributions }) {
  const examples = [`${selector.toLowerCase()} // ${signature}`];
  for (const attribution of attributions.slice(0, 3)) {
    const contract = attribution.contractName || "verified contract";
    examples.push(`${selector.toLowerCase()} // ${signature} - seen in ${contract} on ${attribution.chain}`);
  }
  return examples;
}
