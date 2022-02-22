import { v4 } from 'uuid';
import ServiceDiscovery from './ServiceDiscovery';
import { error } from './logger';

export default class ServiceDiscoveryRepo {
  static serviceDiscoveries: any = {};

  static create(contextId: string) {
    ServiceDiscoveryRepo.serviceDiscoveries[contextId] = new ServiceDiscovery();

    return ServiceDiscoveryRepo.serviceDiscoveries[contextId];
  }

  static destroy(contextId: string) {
    delete ServiceDiscoveryRepo.serviceDiscoveries[contextId];
  }

  static async handleWithServiceDiscoveryContext(handler: any) {
    const contextId = v4();
    const serviceDiscovery = ServiceDiscoveryRepo.create(contextId);

    try {
      return await handler(serviceDiscovery);
    } catch (e) {
      error(e);
    } finally {
      const con = serviceDiscovery.services[ServiceDiscovery.SERVICE_NAME_DB_CLIENT];
      if (con) con.release();

      ServiceDiscoveryRepo.destroy(contextId);
    }
  }
}
