# Security Specification - Ahsell Resorts

## Data Invariants
1. A Room must belong to an existing Hotel (`hotelId` validation).
2. A Booking must reference a valid Room and Hotel.
3. Bookings must have `checkOut` after `checkIn`.
4. Only Admins can modify Hotel/Room data or Update Booking status.
5. Guests can create Bookings but not edit or delete them once submitted.

## The "Dirty Dozen" Payloads (Denial Expected)

1. **Unauthorized Room Creation**: Guest tries to create a room.
2. **Unauthorized Hotel Deletion**: Guest tries to delete a hotel.
3. **Admin Privilege Spoofing**: User tries to add themselves to an `admins` collection.
4. **Booking Outcome Hijack**: Guest tries to update their booking status to 'confirmed'.
5. **ID Poisoning**: Creating a hotel with a 2KB junk string as ID.
6. **Negative Price**: Creating a room with a price of -100.
7. **Over-Guesting**: Booking for 100 guests in a room for 2.
8. **Shadow Field Injection**: Adding `isVerified: true` to a booking payload.
9. **Relational Orphan**: Booking a room with a non-existent `hotelId`.
10. **Timestamp Fraud**: Provided `createdAt` in the past instead of server timestamp.
11. **Privacy Leak**: Authenticated user trying to list all bookings (only owner/admin should see).
12. **Update Gap**: Updating a room's `price` while only allowed to update `isAvailable`.

## Firestore Rules Logic

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // helpers
    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid)); }
    function incoming() { return request.resource.data; }
    function existing() { return resource.data; }
    
    // Default Deny
    match /{document=**} {
      allow read, write: if false;
    }

    match /admins/{userId} {
      allow read: if isSignedIn() && request.auth.uid == userId;
      allow write: if false; // System managed
    }

    match /hotels/{hotelId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /rooms/{roomId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /bookings/{bookingId} {
      allow read: if isAdmin() || (isSignedIn() && existing().email == request.auth.token.email);
      allow create: if true; // Public can book
      allow update: if isAdmin(); // Only admins can confirm/cancel
      allow delete: if isAdmin();
    }
  }
}
```
