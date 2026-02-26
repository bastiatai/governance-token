;; governance-token
;; A SIP-010 compatible fungible token with built-in governance
;; Each token held = 1 vote on proposals
;; Implements all SIP-010 functions without requiring external trait dependency

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-insufficient-balance (err u102))
(define-constant err-proposal-not-found (err u200))
(define-constant err-already-voted (err u201))
(define-constant err-voting-closed (err u202))
(define-constant err-proposal-not-passed (err u203))

;; Token Configuration
(define-fungible-token governance-token)
(define-data-var token-name (string-ascii 32) "Governance Token")
(define-data-var token-symbol (string-ascii 10) "GOVN")
(define-data-var token-decimals uint u6)
(define-data-var token-uri (optional (string-utf8 256)) none)

;; Governance State
(define-data-var proposal-count uint u0)

(define-map proposals
  uint
  {
    proposer: principal,
    title: (string-utf8 256),
    description: (string-utf8 1024),
    votes-for: uint,
    votes-against: uint,
    start-block: uint,
    end-block: uint,
    executed: bool
  }
)

(define-map votes
  { proposal-id: uint, voter: principal }
  { vote: bool, amount: uint }
)

;; SIP-010 Functions

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-not-token-owner)
    (try! (ft-transfer? governance-token amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-read-only (get-name)
  (ok (var-get token-name))
)

(define-read-only (get-symbol)
  (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
  (ok (var-get token-decimals))
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance governance-token who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply governance-token))
)

(define-read-only (get-token-uri)
  (ok (var-get token-uri))
)

;; Governance Functions

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ft-mint? governance-token amount recipient)
  )
)

(define-public (create-proposal
  (title (string-utf8 256))
  (description (string-utf8 1024))
  (voting-period uint))
  (let
    (
      (proposal-id (+ (var-get proposal-count) u1))
      (start-block stacks-block-height)
      (end-block (+ stacks-block-height voting-period))
    )
    (asserts! (> (ft-get-balance governance-token tx-sender) u0) err-insufficient-balance)
    (map-set proposals proposal-id {
      proposer: tx-sender,
      title: title,
      description: description,
      votes-for: u0,
      votes-against: u0,
      start-block: start-block,
      end-block: end-block,
      executed: false
    })
    (var-set proposal-count proposal-id)
    (ok proposal-id)
  )
)

(define-public (vote (proposal-id uint) (vote-for bool))
  (let
    (
      (proposal (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
      (voter-balance (ft-get-balance governance-token tx-sender))
      (existing-vote (map-get? votes { proposal-id: proposal-id, voter: tx-sender }))
    )
    (asserts! (is-none existing-vote) err-already-voted)
    (asserts! (> voter-balance u0) err-insufficient-balance)
    (asserts! (>= stacks-block-height (get start-block proposal)) err-voting-closed)
    (asserts! (<= stacks-block-height (get end-block proposal)) err-voting-closed)

    (map-set votes
      { proposal-id: proposal-id, voter: tx-sender }
      { vote: vote-for, amount: voter-balance }
    )

    (map-set proposals proposal-id
      (merge proposal {
        votes-for: (if vote-for
          (+ (get votes-for proposal) voter-balance)
          (get votes-for proposal)),
        votes-against: (if vote-for
          (get votes-against proposal)
          (+ (get votes-against proposal) voter-balance))
      })
    )
    (ok true)
  )
)

(define-read-only (get-proposal (proposal-id uint))
  (map-get? proposals proposal-id)
)

(define-read-only (get-vote (proposal-id uint) (voter principal))
  (map-get? votes { proposal-id: proposal-id, voter: voter })
)

(define-read-only (get-proposal-count)
  (var-get proposal-count)
)

;; Initialize with initial supply to contract owner
(ft-mint? governance-token u1000000000000 contract-owner)
