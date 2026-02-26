;; Minimal contract for testing error patterns

(define-map values {id: uint} {value: uint})
(define-map balances principal uint)

(define-read-only (get-balance (who principal))
  (default-to u0 (map-get? balances who)))

;; 1. ASSERTS! - Stop execution if condition fails
(define-public (withdraw (amount uint))
  (let ((balance (get-balance tx-sender)))
    (asserts! (>= balance amount) (err u100))
    (ok (- balance amount))))

;; 2. TRY! - Unwrap result, propagate errors up
(define-public (transfer-and-notify (to principal))
  (try! (stx-transfer? u1000 tx-sender to))
  (print {event: "transfer", to: to})
  (ok true))

;; 3. UNWRAP-PANIC - For guaranteed cases
(define-read-only (get-value (key uint))
  (unwrap-panic (map-get? values {id: key})))

;; 4. MATCH - Handle both cases
(define-public (safe-transfer (to principal))
  (match (stx-transfer? u1000 tx-sender to)
    success (ok {transferred: u1000})
    error (ok {transferred: u0})))
