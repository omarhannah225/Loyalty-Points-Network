;; Points Issuance Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))

;; Data Variables
(define-data-var last-program-id uint u0)

;; Data Maps
(define-map loyalty-programs
  { program-id: uint }
  {
    name: (string-ascii 50),
    owner: principal,
    point-name: (string-ascii 20),
    active: bool
  }
)

(define-map point-balances
  { program-id: uint, user: principal }
  { balance: uint }
)

;; Public Functions

;; Create a new loyalty program
(define-public (create-loyalty-program (name (string-ascii 50)) (point-name (string-ascii 20)))
  (let
    (
      (new-id (+ (var-get last-program-id) u1))
    )
    (map-set loyalty-programs
      { program-id: new-id }
      {
        name: name,
        owner: tx-sender,
        point-name: point-name,
        active: true
      }
    )
    (var-set last-program-id new-id)
    (ok new-id)
  )
)

;; Issue points to a user
(define-public (issue-points (program-id uint) (user principal) (amount uint))
  (let
    (
      (program (unwrap! (map-get? loyalty-programs { program-id: program-id }) err-not-found))
      (current-balance (default-to { balance: u0 } (map-get? point-balances { program-id: program-id, user: user })))
    )
    (asserts! (is-eq (get owner program) tx-sender) err-unauthorized)
    (asserts! (get active program) err-unauthorized)
    (map-set point-balances
      { program-id: program-id, user: user }
      { balance: (+ (get balance current-balance) amount) }
    )
    (ok true)
  )
)

;; Deactivate a loyalty program
(define-public (deactivate-program (program-id uint))
  (let
    (
      (program (unwrap! (map-get? loyalty-programs { program-id: program-id }) err-not-found))
    )
    (asserts! (is-eq (get owner program) tx-sender) err-unauthorized)
    (map-set loyalty-programs
      { program-id: program-id }
      (merge program { active: false })
    )
    (ok true)
  )
)

;; Read-only functions

;; Get loyalty program details
(define-read-only (get-loyalty-program (program-id uint))
  (ok (unwrap! (map-get? loyalty-programs { program-id: program-id }) err-not-found))
)

;; Get user's point balance
(define-read-only (get-point-balance (program-id uint) (user principal))
  (ok (get balance (default-to { balance: u0 } (map-get? point-balances { program-id: program-id, user: user }))))
)

;; Initialize contract
(begin
  (var-set last-program-id u0)
)

