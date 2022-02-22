import UnauthorizedError from '../errors/UnauthorizedError';
import useragent from 'express-useragent';
import { error } from './logger';
import ServiceDiscovery from './ServiceDiscovery';
import ServiceDiscoveryRepo from './ServiceDiscoveryRepo';
import NotFoundError from '../errors/NotFoundError';
import BadRequestError from '../errors/BadRequestError';

const defaultError = { code: 500, message: 'Internal server error.' };

export class Controller {
  private connection: any;

  constructor(private serviceDiscovery: ServiceDiscovery) { }

  getAuthToken(req: any) {
    return req.headers['x-auth-token'];
  }

  errorHandle(res: any) {
    return Controller.sendError(res, 500, 'Internal server error.');
  }

  isFromMobile(req: any) {
    return useragent?.parse(req.headers['user-agent'])?.isMobile ?? false;
  }

  getIpAddress(req: any) {
    return req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress;
  }

  async getConnection() {
    if (!this.connection) {
      this.connection = this.serviceDiscovery.get(ServiceDiscovery.SERVICE_NAME_DB_CLIENT);
    }

    return this.connection;
  }

  async onError(req: any, res: any, err: any) {
    error(err);

    const { code, message } = this.handleError(err) ?? defaultError;

    return Controller.sendError(res, code, message);
  }

  handleError(err?: any) {
    if (err instanceof UnauthorizedError) {
      return { code: 401, message: err.message };
    } else if (err instanceof NotFoundError) {
      return { code: 404, message: err.message };
    } else if (err instanceof BadRequestError) {
      return { code: 400, message: err.message };
    }

    return defaultError;
  }

  static sendError(res: any, code = 500, message = 'Internal Server Error.') {
    return res.status(code).json({
      error: message
    });
  }

  async getService(name: string) {
    return await this.serviceDiscovery.get(name);
  }
}

export const handle = (controller: any, action: string) => {
  return async (req: any, res: any) =>
    await ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery: any) => {
      const inst = new controller(serviceDiscovery);

      try {
        return await inst[action](req, res);
      } catch (err) {
        return await inst.onError(req, res, err);
      }
    });
};
