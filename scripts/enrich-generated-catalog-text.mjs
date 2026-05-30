import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = findRoot(process.cwd());
const SHARDS_DIR = join(ROOT, "packages", "catalog", "src", "data", "shards");

const CATEGORY_CONTEXT = {
  account_abstraction: "account, module, validator, paymaster, session-key, or EntryPoint state",
  asset_management: "vault, policy, adapter, fee, asset, or accounting state",
  bridge: "message, route, remote contract, fee, nonce, or finality state",
  contract_sdk: "SDK contract, module, extension, permission, or call-configuration state",
  cross_chain: "source chain, destination chain, endpoint, remote sender, nonce, or message state",
  defi: "protocol balance, route, fee, pool, or configuration state",
  derivatives: "market, order, collateral, price, funding, or position state",
  dex: "pool, route, tick, liquidity, price, slippage, or settlement state",
  lending: "reserve, collateral, debt, health-factor, cap, oracle, or liquidation state",
  l2: "rollup, bridge, inbox/outbox, sequencer, proof, retryable, or system-contract state",
  liquid_staking: "validator, staking, withdrawal, share, oracle, or operator state",
  nft: "token ownership, approval, sale, royalty, or collection state",
  openzeppelin_contracts: "standard library, token, access-control, proxy, or security-guard state",
  "openzeppelin-contracts": "standard library, token, access-control, proxy, or security-guard state",
  oracle: "feed, reporter, price, round, timestamp, authorization, or aggregation state",
  restaking: "operator, vault, delegator, slasher, allocation, or withdrawal state",
  rwa: "asset, subscription, redemption, allowlist, compliance, or custody state",
  stablecoin: "mint, redeem, collateral, reserve, oracle, role, or accounting state",
  staking: "validator, operator, shares, rewards, epoch, cooldown, or withdrawal state",
  streaming: "stream, rate, balance, recipient, duration, or settlement state",
  yield: "vault, strategy, market, reward, maturity, PT/YT, or share-accounting state",
};

const DEFAULT_CONTEXT = "protocol state, transaction inputs, authorization, or configuration";

const FAMILIES = [
  {
    id: "gas",
    match: [/outofgas|insufficientgas|not_enough_gas|notenoughgas|gaslimit|gas_limit|gastoolow|gas_too_low|gasfee|gas_fee|callgas|callbackgas|executiongas/i],
    summary: "means the protocol rejected the gas, execution-fee, or callback-gas value before the call could complete.",
    likelyCauses: [
      "A bridge message, callback, hook, keeper, or low-level call was configured with too little execution gas.",
      "A relayer, paymaster, bridge adapter, or protocol fee field uses a separate gas limit from the outer transaction gas.",
      "The call path requires a minimum gas reserve before forwarding execution to another contract.",
    ],
    nextSteps: [
      "Decode the error arguments and compare the required gas or fee with the gas-related fields submitted in calldata.",
      "Increase the protocol callback, execution, or message gas field as well as the outer transaction gas if both are present.",
      "If the error names call depth or forwarding, simplify the call path instead of only raising gas.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "yes",
  },
  {
    id: "access",
    match: [/unauthori[sz]ed|forbidden|notallowed|notpermitted|accessdenied|only(owner|admin|role|governor|guardian|operator|manager|controller)|not(owner|admin|role|governor|guardian|operator|manager|controller|authorized)|permission|missingrole|rolemissing|roledenied|caller|sendernotallowed|callernotallowed/i],
    summary: "means the effective caller does not satisfy the contract's owner, role, operator, or permission check.",
    likelyCauses: [
      "The transaction sender is not the owner, admin, operator, guardian, manager, controller, or role holder checked by the contract.",
      "A proxy, relayer, account-abstraction wallet, delegatecall, or multicall changed the effective caller from the address you expected.",
      "Governance or an admin has not granted the permission yet, or the permission was revoked before this call.",
    ],
    nextSteps: [
      "Check the effective msg.sender for the failing frame, including proxy, relayer, delegatecall, and account-abstraction context.",
      "Read the owner, role registry, operator approval, or permission mapping for the caller at the same block.",
      "Call from the authorized account or grant the missing role before retrying.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "approval",
    match: [/allowance|approval|approved|approve|permit2|spender|operatorapproval|notapproved|insufficientapproval/i],
    summary: "points to a missing or insufficient allowance, permit, spender approval, or operator approval.",
    likelyCauses: [
      "The approved spender is not the contract that actually calls transferFrom or operator transfer.",
      "Allowance, Permit2 allowance, NFT approval, or operator approval is lower than the requested transfer amount.",
      "A router, vault, settlement contract, or account module sits between the user and the final protocol contract.",
    ],
    nextSteps: [
      "Compare the spender/operator in calldata with the address that performs the token transfer.",
      "Refresh allowance and permit state at the same block as the revert, including Permit2 or collection-level approvals.",
      "Submit the required approval or permit for the exact router, vault, or module before retrying.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "signature",
    match: [/signature|signer|ecrecover|eip712|eip_712|permit|invalidsig|badsig|digest|witness|replay/i],
    summary: "means signature, signer, typed-data, permit, witness, or replay protection validation failed.",
    likelyCauses: [
      "The signature was produced for a different chain id, verifying contract, domain, nonce, deadline, or payload.",
      "The recovered signer is not the expected owner, delegate, validator, or order signer.",
      "The nonce was already used, the permit expired, or the signature was assembled from stale quote/order data.",
    ],
    nextSteps: [
      "Rebuild the signature or typed data using the current chain id, verifying contract, domain name/version, nonce, and deadline.",
      "Recover the signer locally and compare it with the expected owner, validator, or order signer.",
      "Discard stale permits, quotes, and orders after a nonce-changing transaction or domain change.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "nonce",
    match: [/nonce|alreadyused|usedalready|replay|sequencenumber|sequencecounter|sequenceid|sequenceno|seqnum|saltalready|invalidsalt/i],
    summary: "means the transaction, permit, order, message, or request nonce does not match the next valid value expected by the contract.",
    likelyCauses: [
      "The nonce, salt, sequence number, or request id has already been consumed.",
      "The client submitted transactions out of order or reused a signed payload after another state-changing action.",
      "A cross-chain message, account module, permit helper, or orderbook tracks nonces separately from the wallet account nonce.",
    ],
    nextSteps: [
      "Read the protocol nonce, consumed bitmap, salt status, or sequence counter for the sender/order/message.",
      "Regenerate the signed payload with the next unused protocol nonce instead of resubmitting the old one.",
      "Stop retrying if the id was already consumed and reconcile the resulting on-chain state.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "deadline",
    match: [/\b(deadline|expired|expiry|expiration|stale|too\s+early|too\s+late|before\s+start|after\s+end|not\s+started|not\s+yet|wait|required\s+wait|cooldown|delay|window|maturity|didn.?t\s+pass|hasn.?t\s+passed|hasn.?t\s+surpassed|not\s+passed|surpassed)\b/i],
    wordOnly: true,
    summary: "means the block timestamp or protocol delay is outside the execution window accepted by the contract.",
    likelyCauses: [
      "The transaction arrived after its deadline, order expiry, claim window, or permit expiration.",
      "The action was submitted before a start time, timelock, cooldown, maturity, or required wait period.",
      "A quote, order, signed payload, or off-chain state snapshot was created against stale timing data.",
    ],
    nextSteps: [
      "Compare the deadline, start time, end time, cooldown, timelock, or maturity with the reverting block timestamp.",
      "Refresh the quote/order/permit or wait until the required delay has elapsed.",
      "Create a new transaction with a valid deadline if the old payload expired.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "balance",
    match: [/insufficient(balance|funds|liquidity|collateral|reserve|value|assets?)|not.?enough|balance.*low|underfunded|emptyvault|nothingtowithdraw|amount.*exceed/i],
    summary: "means the account, vault, pool, escrow, reserve, or market does not have enough usable balance or liquidity.",
    likelyCauses: [
      "The sender's token balance, native balance, collateral, vault shares, or internal accounting balance is below the requested amount.",
      "The pool, reserve, vault, market, or escrow lacks enough available liquidity for the operation.",
      "Fees, debt, pending withdrawals, slippage, or locked balances reduce the spendable amount below the visible balance.",
    ],
    nextSteps: [
      "Check token balance, native balance, internal vault balance, debt, and available liquidity at the same block as the revert.",
      "Reduce the requested amount or add funds, collateral, shares, or liquidity before retrying.",
      "Account for protocol fees, pending withdrawals, and locked balances when computing spendable amount.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "invalid-input",
    match: [/zero(address|amount|value|shares|assets|length)|(address|amount|value|shares|assets|length)zero|cannotbezero|cannotbesame|mustbezero|nulladdress|invalid(address|amount|recipient|sender|receiver|token|asset|length|index|id|input|param|argument|array|proof|path|route)|bad(input|param|argument|length)|empty(array|input|data|string)|lengthmismatch|arraylength|outofbounds|indexoutofrange|same(address|token|asset)|mismatch/i],
    summary: "means one of the submitted addresses, amounts, ids, indexes, array lengths, routes, or encoded payload fields failed local validation.",
    likelyCauses: [
      "A zero address, zero amount, invalid token, bad recipient, empty payload, or unsupported id was supplied.",
      "Parallel arrays, route/path data, proof data, or encoded parameters do not match the contract's expected shape.",
      "The client reused calldata built for another asset, account, market, chain, or contract version.",
    ],
    nextSteps: [
      "Decode calldata and error arguments, then map each value back to the submitted form, quote, route, or SDK request.",
      "Validate addresses, amounts, ids, array lengths, and encoded payloads before signing or sending.",
      "Rebuild the transaction with current protocol metadata and contract addresses.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "bounds",
    match: [/\b(above|max|minimum|maximum|below|min|too\s+high|too\s+low|too\s+large|too\s+small|too\s+much|overflow|underflow|exceed|exceeded|limit|cap|threshold|ratio|bps|percent|bound|bounds|constraint)\b/i],
    wordOnly: true,
    summary: "means a numeric bound, cap, threshold, ratio, fee, or limit check rejected the submitted value.",
    likelyCauses: [
      "An amount, fee, ratio, price, leverage, cap, duration, or basis-point value is above or below the allowed range.",
      "The protocol configuration changed after the quote or transaction was prepared.",
      "Rounding, decimals, shares/assets conversion, or fixed-point math pushed the final value past a limit.",
    ],
    nextSteps: [
      "Decode the failing value and compare it with the current cap, minimum, maximum, ratio, or threshold in contract state.",
      "Recalculate amounts using the token decimals and protocol rounding rules.",
      "Clamp the submitted value to the current limit or wait for governance/admin configuration to change.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "slippage",
    match: [/\b(slippage|price|oracle\s*price|amount\s*out|min\s*out|output|amount\s*in|max\s*in|swap|tick|sqrt\s*price|liquidity|pool|reserve|quote|rate)\b/i],
    wordOnly: true,
    summary: "means current pool, oracle, quote, tick, liquidity, or slippage conditions no longer satisfy the requested trade or valuation.",
    likelyCauses: [
      "The pool price, oracle price, route liquidity, tick range, or quote changed before execution.",
      "Minimum output, maximum input, price limit, or acceptable slippage was set too tightly.",
      "The selected pool, market, route, or token pair is inactive, uninitialized, paused, or missing liquidity.",
    ],
    nextSteps: [
      "Refresh the quote against the latest block and recompute min-out, max-in, price limit, and route data.",
      "Inspect pool liquidity, tick range, oracle price, and market status before retrying.",
      "Adjust slippage only if the new price is acceptable to the user or integration policy.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "oracle",
    match: [/oracle|pricefeed|datafeed|aggregator|round|stale|sequenceruptime|answer|report|reporter|observation|twap|pyth/i],
    summary: "means oracle, feed, reporter, round, timestamp, or price-bound state failed validation.",
    likelyCauses: [
      "The price/feed answer is stale, missing, out of bounds, negative, or from an unexpected round.",
      "The reporter, oracle, sequencer uptime feed, or aggregation path is not authorized or not initialized.",
      "The protocol is protecting against using unsafe oracle data after an outage, pause, or market move.",
    ],
    nextSteps: [
      "Read the referenced feed, latest round, timestamp, answer, sequencer status, and staleness threshold.",
      "Wait for a fresh oracle update or use the market/asset only after the feed is healthy.",
      "Verify the configured feed address and decimals for the asset or market.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "bridge",
    match: [/bridge|message|inbox|outbox|gateway|remote|endpoint|destination|sourcechain|destchain|chainid|domain|teleporter|wormhole|layerzero|hyperlane|axelar|ccip|stargate|crosschain|xchain|retryable/i],
    summary: "points to cross-chain message, route, domain, endpoint, nonce, proof, fee, or finality state.",
    likelyCauses: [
      "The source chain, destination chain, remote sender, endpoint, bridge adapter, or trusted remote is not the one the contract expects.",
      "The message proof is not finalized, the message was already processed, or the replay/nonce guard rejected it.",
      "The bridge execution fee, route payload, gas limit, or remote configuration was built for a different chain or deployment.",
    ],
    nextSteps: [
      "Check source chain id, destination chain id, message id/nonce, endpoint, trusted remote, and bridge adapter configuration.",
      "Confirm the message is finalized and executable on the destination before retrying.",
      "If the message was already processed, stop retrying and reconcile destination-chain state.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "sometimes",
  },
  {
    id: "lending",
    match: [/borrow|repay|debt|collateral|health|liquidat|ltv|loan|supplycap|borrowcap|reserve|emode|isolation|solvent|insolvent/i],
    summary: "means lending-market collateral, debt, reserve, cap, health-factor, or liquidation constraints rejected the action.",
    likelyCauses: [
      "The account would become undercollateralized, exceed a borrow/supply cap, or violate reserve configuration.",
      "Oracle prices, collateral factors, isolation/e-mode settings, or liquidation thresholds changed before execution.",
      "The repay, withdraw, borrow, seize, or liquidation amount does not fit the market's current accounting.",
    ],
    nextSteps: [
      "Read collateral, debt, health factor, reserve caps, oracle prices, and liquidation thresholds at the reverting block.",
      "Reduce borrow/withdraw size, add collateral, repay debt, or choose a valid liquidation amount.",
      "Refresh market configuration and account data immediately before submitting.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "vault",
    match: [/vault|share|shares|asset|assets|deposit|withdraw|redeem|mint|burn|strategy|queue|4626|accounting|preview/i],
    summary: "means vault share accounting, asset conversion, deposit/withdraw limits, strategy state, or queue state rejected the call.",
    likelyCauses: [
      "The requested assets or shares exceed the vault's current deposit, mint, withdraw, or redeem limit.",
      "Share/asset conversion, rounding, fees, pending withdrawals, or strategy accounting changed before execution.",
      "The vault, strategy, asset, or withdrawal queue is paused, uninitialized, full, or in the wrong phase.",
    ],
    nextSteps: [
      "Read maxDeposit/maxMint/maxWithdraw/maxRedeem or protocol-specific limits for the account and asset.",
      "Recalculate shares/assets with current vault accounting, fees, and rounding rules.",
      "Use the active withdrawal queue or wait for strategy/accounting state to settle before retrying.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "staking",
    match: [/stake|staking|unstake|delegat|validator|reward|epoch|checkpoint|slash|withdrawal|cooldown/i],
    summary: "points to staking, delegation, validator/operator, reward, epoch, slashing, or withdrawal state.",
    likelyCauses: [
      "The validator, operator, delegator, vault, reward epoch, or withdrawal queue is not in the state required for this action.",
      "The account lacks enough active stake, shares, rewards, or withdrawal credits.",
      "A cooldown, checkpoint, slashing, claim, or epoch transition has not completed yet.",
    ],
    nextSteps: [
      "Read operator/delegator status, active stake, shares, current epoch, reward state, and withdrawal queue position.",
      "Wait for cooldown, checkpoint, epoch finalization, or withdrawal availability when the error is timing-related.",
      "Submit from the authorized operator/delegator account or adjust the stake/withdrawal amount.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "governance",
    match: [/proposal|vote|voting|quorum|governor|governance|timelock|queue|delegate/i],
    summary: "means proposal, vote, quorum, queue, timelock, delegation, or execution state does not allow the requested governance action.",
    likelyCauses: [
      "The proposal is not in the lifecycle state required for voting, queueing, cancelling, or execution.",
      "The voter already voted, lacks voting weight, or supplied an unsupported vote type.",
      "Quorum, delay, timelock, or delegation requirements have not been satisfied.",
    ],
    nextSteps: [
      "Read proposal state, voting window, quorum, vote receipts, delegation, and timelock status.",
      "Submit the action only during the proposal phase that permits it.",
      "Refresh voting power and prior receipt state before attempting another vote.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "paused",
    match: [/paused|pause|frozen|freeze|disabled|shutdown|emergency|inactive|closed|halted|stopped|(?<!un)locked/i],
    summary: "means the protocol, market, token, function, route, or module is paused, frozen, disabled, locked, or shut down.",
    likelyCauses: [
      "An admin, guardian, circuit breaker, emergency module, or market-state flag disabled this action.",
      "The feature is intentionally locked during migration, incident response, auction settlement, or maintenance.",
      "The selected market, pool, token, bridge route, or module is inactive on this deployment.",
    ],
    nextSteps: [
      "Read the pause, emergency, market status, route status, module status, or feature flag before retrying.",
      "Wait for an authorized unpause only if the protocol expects the action to resume.",
      "Switch to an active market, route, token, module, or contract version when available.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "duplicate-state",
    match: [/already|duplicate|exists|registered|initialized|init|cached|claimed|processed|filled|cancelled|canceled|settled|done|completed/i],
    summary: "means the contract state already contains, processed, initialized, claimed, filled, cancelled, settled, or registered this item.",
    likelyCauses: [
      "The same id, account, market, order, message, claim, module, or configuration was submitted before.",
      "Another transaction changed state between quote/signing and execution.",
      "The client retried a payload that was already accepted or intentionally cancelled.",
    ],
    nextSteps: [
      "Read the status for the id, order hash, message nonce, claim period, module, market, or configuration key.",
      "Stop retrying if the action already succeeded or was intentionally finalized.",
      "Create a new id/order/message/configuration only if the user intends a separate action.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "missing-state",
    match: [/notfound|not_found|missing|unknown|doesnotexist|notexist|unregistered|notregistered|notyetregistered|nonexistent|uninitialized|notinitialized|empty|notcreated|notavailable|unavailable/i],
    summary: "means the contract could not find the expected account, market, route, module, token, order, message, or configuration state.",
    likelyCauses: [
      "The client referenced an id, market, pool, token, route, module, order, or message that is not initialized on this deployment.",
      "The action was submitted against the wrong chain, proxy, registry, or contract version.",
      "Required setup, registration, creation, funding, or finality has not happened yet.",
    ],
    nextSteps: [
      "Verify the referenced id/address/market/route/module against the protocol registry at the same block.",
      "Check that setup or registration completed on the intended chain and contract version.",
      "Create or register the missing object, or refresh the integration metadata before retrying.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "proxy-upgrade",
    match: [/proxy|implementation|upgrade|beacon|initializer|initiali[sz]e|admin|uups|delegatecall/i],
    summary: "points to proxy, implementation, initializer, upgrade, beacon, or delegatecall lifecycle checks.",
    likelyCauses: [
      "The proxy or implementation is already initialized, not initialized, or controlled by a different admin.",
      "The upgrade target, beacon, initializer calldata, or storage layout is invalid for this deployment.",
      "The call reached the implementation directly instead of the proxy, or vice versa.",
    ],
    nextSteps: [
      "Check proxy admin, implementation, beacon, initialized version, and upgrade authorization state.",
      "Submit initializer or upgrade calldata through the expected proxy/admin path.",
      "Verify the deployment address and contract version before retrying.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "reentrancy",
    match: [/reentran|locked|lock|mutex|entered|recursive/i],
    summary: "means a reentrancy guard, execution lock, or transient state latch blocked nested execution.",
    likelyCauses: [
      "The call path attempted to re-enter a guarded function before the previous execution frame finished.",
      "A hook, callback, token receiver, multicall, or external integration caused nested execution.",
      "A protocol-level lock is still active for the account, market, pool, or operation.",
    ],
    nextSteps: [
      "Trace the call stack to find the hook, callback, token receiver, or multicall frame that re-entered.",
      "Split the action into separate transactions or avoid callbacks into the guarded function.",
      "Wait for protocol locks to clear when the lock is intentionally state-based.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "fee",
    match: [/(?<!data)fee(?!d|rc)|royalty|premium|spread|commission|toll|charge|cost|payment|underpaid|overpaid/i],
    summary: "means a fee, royalty, premium, payment amount, recipient, or fee-token check rejected the transaction.",
    likelyCauses: [
      "The submitted fee or payment is below the protocol requirement or above the allowed maximum.",
      "Fee recipient, royalty receiver, payment token, native value, or refund address is invalid.",
      "The fee quote became stale after gas, price, route, or configuration changed.",
    ],
    nextSteps: [
      "Recompute the protocol fee, native value, royalty, premium, and refund path from current contract state.",
      "Verify payment token, recipient, decimals, and fee cap before retrying.",
      "Refresh off-chain fee quotes immediately before submission.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "token-transfer",
    match: [/transfer|token|erc20|erc721|erc1155|mint|burn|receiver|recipient|blacklist|blocklist|allowlist|whitelist|kyc|compliance/i],
    summary: "means token movement, minting, burning, receiver, transfer-list, or compliance rules rejected the call.",
    likelyCauses: [
      "The sender, receiver, token id, amount, or token contract does not satisfy the token's transfer rules.",
      "A blocklist, allowlist, KYC, lockup, soulbound, pause, or compliance check blocks movement.",
      "The receiver contract does not implement the required token-receiver hook or rejects the transfer.",
    ],
    nextSteps: [
      "Check balances, ownership, approvals, receiver hooks, transfer restrictions, and compliance lists at the same block.",
      "Use an allowed sender/receiver and the correct token id/amount before retrying.",
      "Route through the token's supported transfer or redemption flow if direct transfer is restricted.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "order-auction",
    match: [/order|auction|bid|ask|offer|fill|fillable|cancel|settle|listing|sale|reserve/i],
    summary: "points to order, auction, listing, bid, fill, cancellation, or settlement state.",
    likelyCauses: [
      "The order, bid, listing, or auction is expired, cancelled, already filled, not active, or below reserve constraints.",
      "The fill amount, price, taker, maker, nonce, or settlement route no longer matches current orderbook state.",
      "Another transaction consumed or invalidated the order before this transaction executed.",
    ],
    nextSteps: [
      "Refresh order hash, status, nonce, expiry, fill amount, price, and cancellation state immediately before submission.",
      "Create a new order or bid if the previous one is no longer live.",
      "Avoid resubmitting a fill after the order has already settled or been cancelled.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
  {
    id: "math",
    match: [/math|overflow|underflow|division|divide|mul|round|cast|safe|precision|fixedpoint|sqrt|log/i],
    summary: "means arithmetic, casting, rounding, division, precision, or fixed-point constraints rejected the operation.",
    likelyCauses: [
      "The submitted amount, price, ratio, or intermediate calculation overflows, underflows, divides by zero, or loses required precision.",
      "Token decimals, share conversion, fixed-point scaling, or rounding rules differ from the client calculation.",
      "The protocol's invariant cannot hold for the requested state transition.",
    ],
    nextSteps: [
      "Recalculate the relevant amounts using the contract's decimals, scaling factors, and rounding direction.",
      "Decode error arguments and compare them with the invariant or math helper in the referenced source.",
      "Reduce the amount or use a valid price/ratio range before retrying.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
  },
  {
    id: "account-abstraction",
    match: [/userop|useroperation|entrypoint|paymaster|aggregator|validator|plugin|module|hook|session|factory|smartaccount|account/i],
    summary: "points to smart-account validation, module, plugin, hook, paymaster, factory, or EntryPoint integration state.",
    likelyCauses: [
      "The smart account, module, plugin, session key, validator, factory, or paymaster is missing, disabled, or not authorized.",
      "UserOperation calldata, nonce, signature, validation data, or paymaster data was built against stale account state.",
      "The call is being submitted through the wrong EntryPoint, account implementation, or chain deployment.",
    ],
    nextSteps: [
      "Read installed modules/plugins/hooks, account nonce, validation policy, paymaster status, and EntryPoint address.",
      "Regenerate the UserOperation after refreshing account state, chain id, signature, and paymaster data.",
      "Install or enable the required module/session/plugin before retrying.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "sometimes",
  },
  {
    id: "state",
    match: [/state|status|phase|mode|active|inactive|enabled|disabled|configured|config|setting|registry|route|market/i],
    summary: "means the protocol state, phase, mode, registry, market, route, or configuration does not allow this action.",
    likelyCauses: [
      "The contract is in a different lifecycle phase, market mode, route state, or configuration state than the client expected.",
      "Governance, admin, keeper, or registry updates changed the allowed path before execution.",
      "The submitted transaction targets an unsupported deployment, market, module, or feature flag.",
    ],
    nextSteps: [
      "Read the relevant status, phase, registry, route, market, and configuration values at the reverting block.",
      "Refresh integration metadata and submit only while the protocol state permits the action.",
      "Use the supported market, module, route, or contract version before retrying.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
  },
];

const CATEGORY_FALLBACKS = {
  account_abstraction: "account-abstraction",
  bridge: "bridge",
  cross_chain: "bridge",
  l2: "bridge",
  dex: "slippage",
  lending: "lending",
  oracle: "oracle",
  restaking: "staking",
  staking: "staking",
  liquid_staking: "staking",
  yield: "vault",
  asset_management: "vault",
  rwa: "token-transfer",
  stablecoin: "token-transfer",
  derivatives: "state",
  nft: "order-auction",
  streaming: "balance",
  contract_sdk: "state",
  "openzeppelin-contracts": "state",
};

const FAMILY_BY_ID = new Map(FAMILIES.map((family) => [family.id, family]));
const generatedCustomRe = /^(.+?) custom error ([A-Za-z_$][\w$]*)\(([^)]*)\)\.$/;
const enrichedCustomRe = /^(.+?) rejected the call at ([A-Za-z_$][\w$]*)(?:\(([^)]*)\))?: /;
const generatedReasonRe = /^(.+?) revert reason string: (.+)\.$/;
const enrichedReasonRe = /^(.+?) reverted with "(.+)", an exact source-level check that /;

let filesTouched = 0;
let entriesTouched = 0;
const touchedByCategory = new Map();
const touchedByKind = new Map();

for (const file of listJsonFiles(SHARDS_DIR)) {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) continue;

  let changed = false;
  const next = parsed.map((entry) => {
    const enriched = enrichEntry(entry);
    const kind = enriched.__kind;
    if (kind) delete enriched.__kind;
    if (kind && JSON.stringify(enriched) !== JSON.stringify(entry)) {
      changed = true;
      entriesTouched += 1;
      increment(touchedByCategory, entry.category ?? "(none)");
      increment(touchedByKind, kind);
      return enriched;
    }
    return entry;
  });

  if (changed) {
    writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
    filesTouched += 1;
  }
}

console.log(
  JSON.stringify(
    {
      filesTouched,
      entriesTouched,
      touchedByKind: sortedObject(touchedByKind),
      topCategories: [...touchedByCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([category, count]) => ({ category, count })),
    },
    null,
    2,
  ),
);

function enrichEntry(entry) {
  if (!Array.isArray(entry.references) || entry.references.length === 0) return entry;

  const custom = generatedCustomRe.exec(entry.summary ?? "") ?? enrichedCustomRe.exec(entry.summary ?? "");
  if (custom) {
    const [, prefix, name, rawParams = ""] = custom;
    const params = parseParams(rawParams);
    const family = classifyEntry({ entry, name, text: name });
    return {
      ...entry,
      summary: `${prefix} rejected the call at ${name}${params.length ? `(${params.join(",")})` : ""}: ${family.summary}`,
      likelyCauses: withDecodedArgs(family.likelyCauses, params, entry.category),
      nextSteps: withSourceStep(family.nextSteps, "Decode the custom error arguments and map them to the transaction inputs or current contract state."),
      retryHelpful: family.retryHelpful,
      increasingGasHelpful: family.increasingGasHelpful,
      __kind: "ecosystem-custom",
    };
  }

  const reason = generatedReasonRe.exec(entry.summary ?? "") ?? enrichedReasonRe.exec(entry.summary ?? "");
  if (reason) {
    const [, prefix, value] = reason;
    const family = classifyEntry({ entry, name: value, text: value });
    return {
      ...entry,
      summary: `${prefix} reverted with "${value}", an exact source-level check that ${family.summary}`,
      likelyCauses: withReasonContext(family.likelyCauses, entry.category),
      nextSteps: withSourceStep(family.nextSteps, "Search the referenced source for the exact reason string and inspect the surrounding require/revert branch."),
      retryHelpful: family.retryHelpful,
      increasingGasHelpful: family.increasingGasHelpful,
      __kind: "ecosystem-reason",
    };
  }

  if (entry.source === "sourcify-signatures" && /^Sourcify-verified custom error /.test(entry.summary ?? "")) {
    return {
      ...entry,
      summary: entry.summary.replace(/^Sourcify-verified custom error /, "Sourcify verified-selector match "),
      __kind: "sourcify-bucket",
    };
  }

  if (entry.source === "sourcify-signatures" && /^Sourcify links /.test(entry.summary ?? "")) {
    const summary = entry.summary.replace(/^Sourcify links (?:selector\s+)*/, "Sourcify links selector ");
    if (summary === entry.summary) return entry;
    return {
      ...entry,
      summary,
      __kind: "sourcify-bucket",
    };
  }

  return entry;
}

function classifyEntry({ entry, text }) {
  const compact = normalizeCompact(text);
  const words = normalizeWords(text);

  const accountAbstractionFamily = FAMILY_BY_ID.get("account-abstraction");
  if (
    entry.category === "account_abstraction" &&
    accountAbstractionFamily &&
    /delegateandrevert|depositfailed|executionresult|executeerror|senderaddressresult|validationresult/.test(compact)
  ) {
    return accountAbstractionFamily;
  }

  const priorityFamilyIds = [
    "gas",
    "invalid-input",
    "nonce",
    "access",
    "missing-state",
    "deadline",
    "duplicate-state",
    "paused",
    "approval",
    "signature",
    "fee",
    "oracle",
    "bounds",
  ];
  const priorityFamilies = new Set(priorityFamilyIds);
  for (const id of priorityFamilyIds) {
    const family = FAMILY_BY_ID.get(id);
    if (family && familyMatches(family, compact, words)) return family;
  }

  for (const family of FAMILIES) {
    if (priorityFamilies.has(family.id)) continue;
    if (familyMatches(family, compact, words)) return family;
  }

  const categoryFallback = CATEGORY_FALLBACKS[entry.category];
  if (categoryFallback && FAMILY_BY_ID.has(categoryFallback)) return FAMILY_BY_ID.get(categoryFallback);

  return FAMILY_BY_ID.get("state");
}

function familyMatches(family, compact, words) {
  const haystacks = family.wordOnly ? [words] : [compact, words];
  return family.match.some((pattern) => haystacks.some((haystack) => pattern.test(haystack)));
}

function withDecodedArgs(causes, params, category) {
  const hints = paramHints(params);
  const context = categoryContext(category);
  return unique([
    ...causes,
    hints
      ? `Decoded arguments usually identify the relevant ${hints}; compare them with ${context}.`
      : `The selector has no typed arguments, so confirm the surrounding source branch and ${context}.`,
  ]);
}

function withReasonContext(causes, category) {
  return unique([
    ...causes,
    `Because the revert reason is exact text from the referenced source, treat it as checking ${categoryContext(category)}, not as a generic execution failure.`,
  ]);
}

function withSourceStep(steps, sourceStep) {
  return unique([sourceStep, ...steps]).slice(0, 4);
}

function paramHints(params) {
  const hints = new Set();
  for (const param of params) {
    if (/^address/.test(param)) hints.add("account, token, router, module, receiver, or authority address");
    else if (/^uint|^int/.test(param)) hints.add("amount, limit, nonce, timestamp, id, price, or configured bound");
    else if (/^bytes32/.test(param)) hints.add("id, hash, domain, role, message, order, or storage key");
    else if (/^bytes/.test(param)) hints.add("encoded payload, signature, proof, route, or hook data");
    else if (/^bool/.test(param)) hints.add("boolean mode or feature flag");
    else if (/^string/.test(param)) hints.add("name, symbol, reason, URI, or identifier");
    else hints.add("decoded argument value");
  }
  return [...hints].join("; ");
}

function parseParams(rawParams) {
  if (!rawParams.trim()) return [];
  return rawParams
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean);
}

function categoryContext(category) {
  return CATEGORY_CONTEXT[category] ?? DEFAULT_CONTEXT;
}

function normalizeCompact(value) {
  return String(value)
    .replace(/[_\-\s:()'",./\\]+/g, "")
    .toLowerCase();
}

function normalizeWords(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-:()'",./\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function unique(items) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedObject(map) {
  return Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function listJsonFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listJsonFiles(full);
    return entry.name.endsWith(".json") ? [full] : [];
  });
}

function findRoot(start) {
  let dir = resolve(start);
  while (true) {
    try {
      readdirSync(dir);
      readFileSync(join(dir, "pnpm-workspace.yaml"), "utf8");
      return dir;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) throw new Error("Could not find repository root");
      dir = parent;
    }
  }
}
