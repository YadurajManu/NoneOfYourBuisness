import { Injectable, MessageEvent } from '@nestjs/common';
import { NotificationEvent } from '@prisma/client';
import { Observable, Subject, interval, map, merge } from 'rxjs';

type NotificationStreamPayload =
  | {
      kind: 'created';
      notification: NotificationEvent;
    }
  | {
      kind: 'read';
      notificationId: string;
      readAt: string;
    }
  | {
      kind: 'heartbeat';
      at: string;
    };

@Injectable()
export class NotificationsRealtimeService {
  private readonly streams = new Map<
    string,
    Subject<NotificationStreamPayload>
  >();

  streamFamilyNotifications(
    organizationId: string,
    familyUserId: string,
  ): Observable<MessageEvent> {
    const stream = this.getOrCreateStream(organizationId, familyUserId);

    const live$ = stream.asObservable();
    const heartbeat$ = interval(30000).pipe(
      map(
        () =>
          ({
            kind: 'heartbeat',
            at: new Date().toISOString(),
          }) satisfies NotificationStreamPayload,
      ),
    );

    return merge(live$, heartbeat$).pipe(
      map((data) => ({
        data,
      })),
    );
  }

  publishCreated(notification: NotificationEvent): void {
    this.getOrCreateStream(
      notification.organizationId,
      notification.familyUserId,
    ).next({
      kind: 'created',
      notification,
    });
  }

  publishRead(
    organizationId: string,
    familyUserId: string,
    notificationId: string,
  ): void {
    this.getOrCreateStream(organizationId, familyUserId).next({
      kind: 'read',
      notificationId,
      readAt: new Date().toISOString(),
    });
  }

  private getOrCreateStream(organizationId: string, familyUserId: string) {
    const key = `${organizationId}:${familyUserId}`;
    const existing = this.streams.get(key);
    if (existing) {
      return existing;
    }

    const created = new Subject<NotificationStreamPayload>();
    this.streams.set(key, created);
    return created;
  }
}
