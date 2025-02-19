;; Redemption Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-insufficient-inventory (err u103))

;; Data Variables
(define-data-var last-reward-id uint u0)

;; Data Maps
(define-map rewards
  { reward-id: uint }
  {
    name: (string-ascii 50),
    description: (string-utf8 200),
    cost: uint,
    inventory: uint
  }
)

(define-map redemptions
  { user: principal, reward-id: uint }
  { amount: uint }
)

;; Public Functions

;; Add a new reward
(define-public (add-reward (name (string-ascii 50)) (description (string-utf8 200)) (cost uint) (inventory uint))
  (let
    (
      (new-id (+ (var-get last-reward-id) u1))
    )
    (map-set rewards
      { reward-id: new-id }
      {
        name: name,
        description: description,
        cost: cost,
        inventory: inventory
      }
    )
    (var-set last-reward-id new-id)
    (ok new-id)
  )
)

;; Redeem a reward
(define-public (redeem-reward (reward-id uint) (amount uint))
  (let
    (
      (reward (unwrap! (map-get? rewards { reward-id: reward-id }) err-not-found))
    )
    (asserts! (>= (get inventory reward) amount) err-insufficient-inventory)
    (map-set rewards
      { reward-id: reward-id }
      (merge reward { inventory: (- (get inventory reward) amount) })
    )
    (map-set redemptions
      { user: tx-sender, reward-id: reward-id }
      { amount: (+ amount (default-to u0 (get amount (map-get? redemptions { user: tx-sender, reward-id: reward-id })))) }
    )
    (ok true)
  )
)

;; Read-only functions

;; Get reward details
(define-read-only (get-reward (reward-id uint))
  (ok (unwrap! (map-get? rewards { reward-id: reward-id }) err-not-found))
)

;; Get user's redemption history for a reward
(define-read-only (get-user-redemptions (user principal) (reward-id uint))
  (ok (get amount (default-to { amount: u0 } (map-get? redemptions { user: user, reward-id: reward-id }))))
)

;; Initialize contract
(begin
  (var-set last-reward-id u0)
)

