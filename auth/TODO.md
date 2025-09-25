# Fix User Addresses API Tests

## Issues Identified
1. **Address ID not returned in POST response**: The `newAddress` object doesn't have `_id` after save, causing DELETE/PUT to fail with 404.
2. **isDefault logic mismatch**: Controller sets `isDefault: true` for first address, but tests expect input value in some cases.
3. **Validation messages mismatch**: Tests expect "Invalid phone number/pincode" but middleware shows length messages first.

## Plan
- [ ] Fix `addUserAddressController` to return address with `_id` from saved user.
- [ ] Update validator middleware to show "Invalid phone number/pincode" for length mismatches.
- [ ] Update tests to expect `isDefault: true` for first address in relevant cases.

## Files to Edit
- `src/controllers/auth.controller.js`
- `src/middlewares/validator.middleware.js`
- `__tests__/user-addresses.test.js`

## Followup Steps
- [ ] Run tests to verify fixes.
- [ ] Ensure all tests pass.
