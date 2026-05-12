# Security Specification for ই-নিবন্ধন

## 1. Data Invariants
- An application must belong to a registered user.
- The status of an application can only be modified by an admin.
- Users can only read and write their own profile and applications.
- Sensitive fields like `role` in the `users` collection cannot be modified by the user themselves.

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing**: User A trying to write an application with `userId` of User B.
2. **Privilege Escalation**: User A trying to set their `role` to 'admin' in their profile.
3. **Status Hijacking**: User A trying to update their application status to 'approved'.
4. **Orphaned Writes**: Creating an application for a non-existent user.
5. **Shadow Fields**: Adding an `isVerified: true` field to an application document.
6. **Malicious ID**: Creating a document with a 1.5KB string as ID.
7. **Resource Poisoning**: Sending a 1MB string for `applicantName`.
8. **PII Leak**: Non-owner trying to 'get' a user profile.
9. **Blanket Read**: Trying to list all applications without an `ownerId` filter.
10. **Timestamp Manipulation**: Sending a fake `createdAt` date from the client.
11. **Terminal State Break**: Post-approval modifications by the user.
12. **Cross-User Update**: User A trying to delete or update an application owned by User B.

## 3. Test Runner (Conceptual)
All the above payloads must return `PERMISSION_DENIED`.
