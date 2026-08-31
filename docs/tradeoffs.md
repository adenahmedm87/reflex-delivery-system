# Reflex Trade-off Log
 
## 1. Periodic GPS instead of second-by-second tracking - Weak point: customer sees a recent position, not a perfect live animation.
-	Acceptable because: lower battery/data/routing cost and simpler sprint implementation.- Later: adaptive tracking frequency.
 
## 2. External routing service for ETA - Weak point: road ETA depends on a third-party routing service.
-	Acceptable because: building a routing engine is outside the sprint.- Later: managed traffic-aware routing and caching.
 
## 3. Offline conflicts - Weak point: an offline rider action may arrive after the server changed.
-	Rule: GPS uses newest valid timestamp; critical status uses server state + version validation and flags stale conflicts.- Later: richer dispatcher merge tools.
 
## 4. Customer tracking with order + phone - Weak point: weaker than one-time secure tracking links.
-	Acceptable because: simple MVP privacy protection.
-	Later: expiring tracking link or OTP login.
 
## 5. Demo OTP shown on screen - Weak point: not real SMS delivery.
-	Acceptable because: proves confirmation logic without a paid SMS provider.
-	Later: SMS/WhatsApp provider, expiry and rate limits.
