import AppService from '../Class/AppService';
import RoutingService from './RoutingService';

type EntityRouteOptions = {
  entity: unknown;
  action?: string;
};

type EntityPathOptions = EntityRouteOptions & {
  params?: Record<string, unknown>;
};

export default class EntityService extends AppService {
  public static serviceName: string = 'entity';
  public static dependencies: typeof AppService[] = [RoutingService];

  private resolveEntityName(entity: unknown): string {
    if (!entity) {
      throw new Error('Entity is required.');
    }

    if (typeof entity === 'string') {
      return entity;
    }

    const entityName = (entity as { entityName?: string })?.entityName
      ?? (entity as { constructor?: { entityName?: string } })?.constructor?.entityName;

    if (!entityName) {
      throw new Error('Entity must define a static entityName.');
    }

    return entityName;
  }

  private resolveEntitySecureId(entity: unknown): string | undefined {
    if (!entity || typeof entity !== 'object') {
      return undefined;
    }

    return (entity as { secureId?: string })?.secureId;
  }

  entityRouteName(options: EntityRouteOptions): string {
    const { entity, action = 'index' } = options;
    const entityName = this.resolveEntityName(entity);

    return `entity_${entityName}_${action}`;
  }

  entityPath(options: EntityPathOptions): string {
    const { params = {}, entity } = options;
    const route = this.entityRouteName(options);
    const secureId = this.resolveEntitySecureId(entity);
    const mergedParams = secureId
      ? { entitySecureId: secureId, ...params }
      : params;

    return this.app.services.routing.path(route, mergedParams);
  }
}
