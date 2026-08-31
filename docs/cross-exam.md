# Reflex State -> Context -> Evidence Cards
 Use only evidence the team actually tested.
 ## Why GPS + ETA?
State: GPS + ETA gives useful delivery visibility.
Context: IN_TRANSIT alone does not tell the customer how far away the rider is. Evidence: add the real tested order/screenshot after QA.
 ## Why periodic GPS?
State: the MVP throttles GPS updates.
Context: second-by-second tracking increases battery, data and routing calls. Evidence: show configured interval and a real customer tracking update.
 ## Why a Delivery Health Score?
State: it helps the dispatcher notice risk before failure.
Context: ON_TRACK / AT_RISK / ACTION_NEEDED are derived from delay, stale GPS and exceptions. Evidence: add the real health threshold test result.
 ## What happens offline?
State: rider status actions queue locally and replay after reconnection.
Context: connectivity loss should not erase real work.
Evidence: add real offline/online test result.
 ## What if an old update conflicts?
State: critical states are not blindly last-write-wins.
Context: an old PICKED_UP event must not move a later delivery backwards.
Evidence: add real conflict response after QA.
 ## Why QR/order code at pickup and OTP at delivery?
State: pickup verifies the correct parcel; OTP verifies the receiving customer participated.
Context: scanning the parcel alone is weak final proof.
Evidence: add the tested pickup + OTP order number.
