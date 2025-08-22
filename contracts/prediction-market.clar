;; Prediction Market Contract
;; Binary outcome betting with oracle resolution

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-amount (err u101))
(define-constant err-market-closed (err u102))
(define-constant err-market-not-resolved (err u103))
(define-constant err-market-already-resolved (err u104))
(define-constant err-invalid-outcome (err u105))
(define-constant err-no-bet-found (err u106))

;; Data Variables
(define-data-var market-question (string-ascii 256) "Will Bitcoin reach $100,000 by end of 2025?")
(define-data-var market-resolved bool false)
(define-data-var winning-outcome bool false)
(define-data-var market-deadline uint u0)
(define-data-var total-yes-bets uint u0)
(define-data-var total-no-bets uint u0)

;; Maps
(define-map user-bets 
  { user: principal, outcome: bool } 
  { amount: uint })

;; Initialize market with deadline
(define-public (initialize-market (question (string-ascii 256)) (deadline uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (> deadline stacks-block-height) err-invalid-amount)
    (var-set market-question question)
    (var-set market-deadline deadline)
    (var-set market-resolved false)
    (ok true)))

;; Place bet on market outcome
(define-public (place-bet (outcome bool) (amount uint))
  (begin
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (< stacks-block-height (var-get market-deadline)) err-market-closed)
    (asserts! (not (var-get market-resolved)) err-market-already-resolved)
    
    ;; Transfer STX from user to contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Update user bet
    (let ((existing-bet (default-to u0 (get amount (map-get? user-bets { user: tx-sender, outcome: outcome })))))
      (map-set user-bets 
        { user: tx-sender, outcome: outcome }
        { amount: (+ existing-bet amount) })
    )
    
    ;; Update totals
    (if outcome
      (var-set total-yes-bets (+ (var-get total-yes-bets) amount))
      (var-set total-no-bets (+ (var-get total-no-bets) amount))
    )
    
    (print { event: "bet-placed", user: tx-sender, outcome: outcome, amount: amount })
    (ok true)))

;; Resolve market (oracle function - only owner)
(define-public (resolve-market (final-outcome bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (>= stacks-block-height (var-get market-deadline)) err-market-closed)
    (asserts! (not (var-get market-resolved)) err-market-already-resolved)
    
    (var-set market-resolved true)
    (var-set winning-outcome final-outcome)
    
    (print { event: "market-resolved", outcome: final-outcome })
    (ok true)))

;; Claim winnings
(define-public (claim-winnings)
  (let (
    (user-bet-data (map-get? user-bets { user: tx-sender, outcome: (var-get winning-outcome) }))
    (total-winning-pool (if (var-get winning-outcome) (var-get total-yes-bets) (var-get total-no-bets)))
    (total-losing-pool (if (var-get winning-outcome) (var-get total-no-bets) (var-get total-yes-bets)))
    (caller tx-sender)
  )
    (asserts! (var-get market-resolved) err-market-not-resolved)
    (asserts! (is-some user-bet-data) err-no-bet-found)
    
    (match user-bet-data
      bet-info 
      (let (
        (bet-amount (get amount bet-info))
        (payout (if (> total-winning-pool u0)
                   (+ bet-amount (/ (* bet-amount total-losing-pool) total-winning-pool))
                   bet-amount))
      )
        ;; Remove user bet to prevent double claiming
        (map-delete user-bets { user: caller, outcome: (var-get winning-outcome) })
        
        ;; Transfer winnings from contract to user
        (try! (as-contract (stx-transfer? payout tx-sender caller)))
        
        (print { event: "winnings-claimed", user: caller, payout: payout })
        (ok payout))
      err-no-bet-found)))

;; Read-only functions
(define-read-only (get-market-info)
  (ok {
    question: (var-get market-question),
    deadline: (var-get market-deadline),
    resolved: (var-get market-resolved),
    winning-outcome: (var-get winning-outcome),
    total-yes-bets: (var-get total-yes-bets),
    total-no-bets: (var-get total-no-bets)
  }))

(define-read-only (get-user-bet (user principal) (outcome bool))
  (ok (map-get? user-bets { user: user, outcome: outcome })))

(define-read-only (get-market-status)
  (ok {
    is-open: (and (< stacks-block-height (var-get market-deadline)) (not (var-get market-resolved))),
    can-resolve: (and (>= stacks-block-height (var-get market-deadline)) (not (var-get market-resolved))),
    can-claim: (var-get market-resolved)
  }))