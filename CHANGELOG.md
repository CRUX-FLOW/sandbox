# Changelog

All notable changes to this project are listed here. Dates are YYYY-MM-DD.

## [0.3.0] - 2026-10-12

### Added
- Reservation holds expire after 3 days and pass to the next member in the queue.
- `DELETE /reservations/:id` cancels a waiting or ready reservation.

### Changed
- Late fees are rounded once on the total instead of per day.

## [0.2.0] - 2026-09-28

### Added
- Reservations queue (FIFO per book).
- Loan renewal, refused while another member is waiting.
- Children's books are charged half the daily late fee.

## [0.1.0] - 2026-09-15

### Added
- Books, members and loans in an in-memory repository.
- Late fees capped at the replacement cost.
- JSON HTTP API on `Bun.serve`.
