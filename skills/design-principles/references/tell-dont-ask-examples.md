# Tell Don't Ask — Extended Examples

## The core violation pattern

Tell Don't Ask violations always look like this:

```
object.getX()  →  if/switch on X  →  object.doSomething()
```

The external code is making decisions that belong to the object.

## Example 1: Domain entity

```typescript
// Wrong: external code queries state and decides
class AppointmentService {
  async cancel(appointmentId: string) {
    const appt = await this.repo.findById(appointmentId);

    if (appt.getStatus() === 'confirmed' && appt.getDate() > new Date()) {
      appt.setStatus('cancelled');
      await this.notifier.sendCancellationEmail(appt.getUserEmail());
    } else {
      throw new Error('Cannot cancel this appointment');
    }
  }
}

// Correct: tell the entity what to do, it knows its own rules
class Appointment {
  cancel(): void {
    if (this.status !== 'confirmed') throw new DomainError('Not cancellable');
    if (this.date <= new Date()) throw new DomainError('Already past');
    this.status = 'cancelled';
    this.addEvent(new AppointmentCancelledEvent(this.id, this.userEmail));
  }
}

class AppointmentService {
  async cancel(appointmentId: string) {
    const appt = await this.repo.findById(appointmentId);
    appt.cancel(); // tell, don't ask
    await this.repo.save(appt);
  }
}
```

## Example 2: Conditional logic on another class's state

```typescript
// Wrong: UserService asking about User state
class UserService {
  async deactivate(userId: string) {
    const user = await this.repo.findById(userId);

    if (!user.isAdmin() && user.getSubscriptionStatus() !== 'trial') {
      user.setActive(false);
      user.setDeactivatedAt(new Date());
    }
  }
}

// Correct: User knows when it can be deactivated
class User {
  deactivate(): void {
    if (this.isAdmin) throw new DomainError('Admins cannot be deactivated');
    if (this.subscription === 'trial') throw new DomainError('Trial users cannot be deactivated');
    this.active = false;
    this.deactivatedAt = new Date();
  }
}
```

## Example 3: Feature flags / permissions

```typescript
// Wrong: permission logic scattered everywhere
if (user.getRole() === 'admin' || user.getPermissions().includes('reports:read')) {
  showReportButton();
}

// Correct: user knows what it can do
class User {
  canReadReports(): boolean {
    return this.role === 'admin' || this.permissions.includes('reports:read');
  }
}

if (user.canReadReports()) {
  showReportButton();
}
```

## When Tell Don't Ask doesn't apply

TDA is about behavior that belongs to the object. It does NOT mean:
- Never use getters for display/serialization
- Never read data to build DTOs/responses
- Never read IDs to pass to another service

The rule applies when the external code is **making decisions** that should be the object's
own responsibility.
