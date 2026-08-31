# Reflex QA Checklist
 Write PASS, FAIL or NOT RUN only after the test happens.
 
| ID | Test | Expected | Result | Evidence |
|---|---|---|---|---|
| QA-01 | API health | API + DB online | | |
| QA-02 | Retailer login | Retailer opens | | |
| QA-03 | Create order | New ORD appears | | |
| QA-04 | Missing field | Validation error | | |
| QA-05 | Dispatcher sees order | CREATED visible | | |
| QA-06 | Assign AVAILABLE rider | ASSIGNED + rider BUSY | | |
| QA-07 | BUSY rider | Cannot assign | | |
| QA-08 | Rider sees job | Assigned order visible | | |
| QA-09 | Wrong pickup code | Rejected | | |
| QA-10 | Correct pickup code | PICKED_UP | | |
| QA-11 | Rider GPS | Location saved | | |
| QA-12 | ETA | ETA appears | | |
| QA-13 | Routing fallback | Fallback ETA appears | | |
| QA-14 | Correct order + phone | Tracking opens | | |
| QA-15 | Wrong phone | Rejected | | |
| QA-16 | OTP request | Demo OTP generated | | |
| QA-17 | Wrong OTP | Not delivered | | |
| QA-18 | Correct OTP | DELIVERED + rider AVAILABLE | | |
| QA-19 | Exception | ACTION_NEEDED | | |
| QA-20 | Product spoilt | Reorder/refund choices | | |
| QA-21 | Reorder | New order, old history kept | | |
| QA-22 | Refund | Refund requested | | |
| QA-23 | Offline status | Saved locally | | |
| QA-24 | Reconnect | Queue syncs | | |
| QA-25 | Stale critical event | Conflict flagged | | |
| QA-26 | Stale GPS | Older point ignored | | |
| QA-27 | <15 min delay | ON_TRACK | | |
| QA-28 | 15-30 min delay | AT_RISK | | |
| QA-29 | >30 min delay | ACTION_NEEDED | | |
| QA-30 | Two dry runs | Both durations recorded | | |
