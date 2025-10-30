# Component Unit Testing Plan

This document outlines the components that should have unit tests, organized by priority and complexity.

## 🔴 High Priority (Business Logic & Core Interactions)

### Auth Components (`src/components/auth/`)

#### 1. `PasswordInput.tsx` ⭐
**Why test:** Pure logic component with critical security UX
- Toggle show/hide password functionality
- Disabled state behavior
- Accessibility (aria-labels)
- Icon switching logic (Eye/EyeOff)

**Test Cases:**
```typescript
- Should render password input with hidden text by default
- Should toggle password visibility when button is clicked
- Should show Eye icon when password is hidden
- Should show EyeOff icon when password is visible
- Should disable both input and toggle button when disabled prop is true
- Should have correct aria-label based on visibility state
- Should call onChange with correct value
```

---

### Playlist Components (`src/components/playlists/`)

#### 2. `ConfirmDialog.tsx` ⭐⭐
**Why test:** Reusable critical UX pattern for destructive actions
- Dialog open/close states
- Confirmation callback execution
- Loading state rendering
- Button disable logic during loading
- Custom text props (confirmText, cancelText)

**Test Cases:**
```typescript
- Should render dialog when isOpen is true
- Should not render dialog when isOpen is false
- Should display correct title and description
- Should call onConfirm when confirm button is clicked
- Should call onOpenChange(false) when cancel button is clicked
- Should disable buttons when isLoading is true
- Should show loading text when isLoading is true
- Should use custom confirmText and cancelText when provided
- Should use default text when custom text not provided
```

#### 3. `UnsavedChangesBar.tsx` ⭐⭐
**Why test:** Important data safety feature preventing data loss
- Conditional rendering (isVisible)
- Save/discard button interactions
- Loading state during save
- Button disabled states

**Test Cases:**
```typescript
- Should not render when isVisible is false
- Should render when isVisible is true
- Should call onSaveOrder when Save Order button is clicked
- Should call onDiscardChanges when Discard button is clicked
- Should disable buttons when isSaving is true
- Should show "Saving..." text when isSaving is true
- Should not render Discard button when onDiscardChanges is not provided
```

#### 4. `PlaylistItem.tsx` ⭐⭐⭐
**Why test:** Complex interactions with multiple states and side effects
- Date formatting logic (formatDate)
- Delete confirmation flow
- Edit action propagation
- Dropdown menu interactions
- Deleted state rendering
- Event propagation (stopPropagation)
- Toast notifications

**Test Cases:**
```typescript
- Should render playlist name and track count
- Should format dates correctly (createdAt, updatedAt)
- Should show "Deleted" badge when isDeleted is true
- Should apply opacity-50 when playlist is deleted
- Should call onClick when card is clicked
- Should not call onClick when playlist is deleted
- Should open delete confirmation dialog when delete is clicked
- Should call onDelete and show success toast on confirm
- Should show error toast when delete fails
- Should call onEdit when edit is clicked
- Should stop event propagation on dropdown actions
- Should disable delete action during deletion
- Should show "Deleting..." text during deletion
- Should not render dropdown when both onEdit and onDelete are undefined
```

---

### UI Components (`src/components/ui/`)

#### 5. `theme-selector.tsx` ⭐
**Why test:** Simple but essential UX feature
- Theme toggle functionality
- Correct icon rendering based on mode
- Accessibility (aria-label)

**Test Cases:**
```typescript
- Should render Moon icon when theme is light
- Should render Sun icon when theme is dark
- Should call toggleMode when button is clicked
- Should have correct aria-label based on current mode
- Should render as icon button with outline variant
```

---

### Profile Components (`src/components/profile/`)

#### 6. `UsageCard.tsx` ⭐⭐
**Why test:** Business logic for billing and usage limits
- Usage percentage calculations
- Near-limit warnings (80% threshold)
- Date formatting (formatResetDate)
- Infinity handling for unlimited plans
- Loading skeleton rendering
- Conditional rendering based on data

**Test Cases:**
```typescript
- Should show skeleton when loading
- Should not render when usage is null/undefined
- Should calculate playlists percentage correctly
- Should calculate AI usage percentage correctly
- Should show destructive badge when playlists >= 80%
- Should show destructive badge when AI usage >= 80%
- Should handle Infinity limit correctly (show ∞)
- Should format reset date correctly
- Should show warning message when near playlist limit
- Should display correct remaining AI generations
- Should render link to /playlists
```

---

## 🟡 Medium Priority (Complex Presentation & Data Display)

### Playlist Components

#### 7. `PlaylistMetaSection.tsx`
**Why test:** Metadata display with conditional logic
- Metadata display logic
- Conditional field rendering
- Date formatting

**Test Cases:**
```typescript
- Should render all provided metadata fields
- Should hide fields when not provided
- Should format dates correctly
- Should handle empty description
```

#### 8. `PlaylistHeader.tsx`
**Why test:** Complex header with multiple actions
- Header interaction behaviors
- Action button states
- Conditional rendering based on permissions

**Test Cases:**
```typescript
- Should render playlist title
- Should call action callbacks when buttons clicked
- Should disable actions based on loading states
- Should show/hide actions based on props
```

---

### Profile Components

#### 9. `AccountCard.tsx`
**Why test:** Form logic with validation
- Form validation display
- Account update logic
- Error state handling

**Test Cases:**
```typescript
- Should render account information
- Should validate form inputs
- Should handle update success
- Should display error messages
- Should disable submit during loading
```

#### 10. `SpotifyCard.tsx`
**Why test:** OAuth integration component
- Connection status display
- OAuth flow initiation
- Disconnection logic

**Test Cases:**
```typescript
- Should show connected state when linked
- Should show disconnected state when not linked
- Should initiate OAuth flow on connect
- Should handle disconnection
- Should display connection status
```

---

## 🟢 Lower Priority (Simpler Components & Utilities)

### Auth Components

#### 11. `AuthHeaderActions.tsx`
- Navigation logic
- Action button rendering

### Playlist Components

#### 12. `PlaylistList.tsx`
- Empty state rendering
- List mapping logic
- Loading state

---

## ⚪ Consider for Integration Tests Instead

These components are better suited for integration or E2E tests due to complex API interactions, form submissions, and multi-step flows:

- `EmailPasswordForm.tsx` - Form submission with API calls
- `MagicLinkForm.tsx` - Email sending logic
- `CreatePlaylistDialog.tsx` - Full playlist creation flow
- `EditPlaylistDialog.tsx` - Full editing flow with validation
- `AddTracksDialog.tsx` - Search + add flow
- `ExportDialog.tsx` - Spotify export process
- `ReorderableTrackList.tsx` - Complex drag-and-drop (better with Playwright)
- `PlaylistDetailClient.tsx` - Full page integration
- `ProfileClient.tsx` - Full page integration
- `AppHeader.tsx` - Navigation with auth state

---

## 📋 Implementation Strategy

### Phase 1: Quick Wins (Start Here)
Focus on these 6 components first (80/20 rule):

1. ✅ `PasswordInput.tsx` - Pure logic, no API calls
2. ✅ `ConfirmDialog.tsx` - Reusable, critical UX pattern
3. ✅ `UnsavedChangesBar.tsx` - Important data safety feature
4. ✅ `theme-selector.tsx` - Simple but essential
5. ✅ `PlaylistItem.tsx` - Complex interactions
6. ✅ `UsageCard.tsx` - Business logic for billing

**Estimated Time:** 6-8 hours  
**Impact:** Covers critical user interactions and business logic

### Phase 2: Medium Priority
Components 7-10 from the medium priority list

**Estimated Time:** 4-6 hours  
**Impact:** Improves coverage for data display and forms

### Phase 3: Complete Coverage
Remaining components from lower priority

**Estimated Time:** 2-4 hours  
**Impact:** Full component test coverage

---

## 🔧 Testing Patterns & Best Practices

### Pattern 1: User Interactions
**Used in:** `PasswordInput`, `ThemeSelector`, `ConfirmDialog`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../../utils/test-utils'
import userEvent from '@testing-library/user-event'

describe('Component with interactions', () => {
    it('should handle click events', async () => {
        const handleClick = vi.fn()
        const user = userEvent.setup()
        
        renderWithProviders(<Component onClick={handleClick} />)
        
        await user.click(screen.getByRole('button'))
        
        expect(handleClick).toHaveBeenCalledTimes(1)
    })
})
```

### Pattern 2: Conditional Rendering
**Used in:** `UnsavedChangesBar`, `UsageCard`, `PlaylistItem`

```typescript
describe('Component with conditional rendering', () => {
    it('should not render when condition is false', () => {
        const { container } = renderWithProviders(
            <Component isVisible={false} />
        )
        
        expect(container).toBeEmptyDOMElement()
    })
    
    it('should render when condition is true', () => {
        renderWithProviders(<Component isVisible={true} />)
        
        expect(screen.getByText(/expected content/i)).toBeInTheDocument()
    })
})
```

### Pattern 3: Async Operations & Loading States
**Used in:** `PlaylistItem`, `ConfirmDialog`, `UnsavedChangesBar`

```typescript
describe('Component with async operations', () => {
    it('should show loading state', () => {
        renderWithProviders(<Component isLoading={true} />)
        
        expect(screen.getByText(/loading/i)).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeDisabled()
    })
    
    it('should handle async action with toast', async () => {
        const onAction = vi.fn().mockResolvedValue(undefined)
        const user = userEvent.setup()
        
        renderWithProviders(<Component onAction={onAction} />)
        
        await user.click(screen.getByRole('button'))
        
        expect(onAction).toHaveBeenCalled()
        // Note: Toast testing may require additional setup
    })
})
```

### Pattern 4: Data Formatting
**Used in:** `PlaylistItem`, `UsageCard`

```typescript
describe('Component with data formatting', () => {
    it('should format dates correctly', () => {
        const testDate = '2024-01-15T10:30:00Z'
        
        renderWithProviders(<Component date={testDate} />)
        
        expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument()
    })
    
    it('should handle infinity correctly', () => {
        renderWithProviders(<Component limit={Infinity} count={5} />)
        
        expect(screen.getByText(/5 \/ ∞/i)).toBeInTheDocument()
    })
    
    it('should calculate percentages correctly', () => {
        renderWithProviders(<Component used={80} total={100} />)
        
        // Component should show warning at 80%
        expect(screen.getByText(/80%/i)).toBeInTheDocument()
    })
})
```

### Pattern 5: Accessibility Testing
**Used in:** All components

```typescript
describe('Component accessibility', () => {
    it('should have correct ARIA labels', () => {
        renderWithProviders(<Component />)
        
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-label', 'Expected label')
    })
    
    it('should be keyboard navigable', async () => {
        const handleAction = vi.fn()
        const user = userEvent.setup()
        
        renderWithProviders(<Component onAction={handleAction} />)
        
        const button = screen.getByRole('button')
        button.focus()
        await user.keyboard('{Enter}')
        
        expect(handleAction).toHaveBeenCalled()
    })
})
```

---

## 📝 Test File Structure

Follow this consistent structure for all component tests:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '../../utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ComponentName } from '@/components/path/ComponentName'

/**
 * Component Description
 * Key behaviors being tested
 */
describe('ComponentName', () => {
    // Setup common test data
    const defaultProps = {
        // Common props used across tests
    }
    
    describe('Rendering', () => {
        it('should render with default props', () => {
            renderWithProviders(<ComponentName {...defaultProps} />)
            
            expect(screen.getByRole('...')).toBeInTheDocument()
        })
        
        it('should render different states', () => {
            // Test various rendering states
        })
    })
    
    describe('User Interactions', () => {
        it('should handle user actions', async () => {
            // Test clicks, inputs, etc.
        })
    })
    
    describe('Edge Cases', () => {
        it('should handle error states', () => {
            // Test error scenarios
        })
        
        it('should handle empty/null data', () => {
            // Test boundary conditions
        })
    })
    
    describe('Accessibility', () => {
        it('should be accessible', () => {
            // Test ARIA, keyboard navigation, etc.
        })
    })
})
```

---

## 🎯 Success Metrics

### Coverage Goals
- **Unit Tests:** 80%+ coverage for listed components
- **Critical Paths:** 100% coverage (auth, payments, data loss prevention)
- **Business Logic:** 100% coverage (calculations, validations)

### Quality Indicators
- All tests pass consistently
- Tests run in < 10 seconds total
- No flaky tests (intermittent failures)
- Tests are maintainable and readable
- Tests catch real bugs during development

---

## 🚀 Getting Started

1. **Review existing test:** See `tests/unit/components/Button.test.tsx`
2. **Start with Phase 1:** Pick `PasswordInput.tsx` first (simplest)
3. **Use test patterns:** Copy patterns from this document
4. **Run tests:** `npm test` or `npm run test:watch`
5. **Check coverage:** `npm run test:coverage`

---

## 📚 Additional Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- Project: `tests/README.md` - Setup and configuration details
- Project: `tests/utils/test-utils.tsx` - Custom render utilities

