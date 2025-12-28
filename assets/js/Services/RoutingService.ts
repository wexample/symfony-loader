import AppService from '../class/AppService';
import Routing from 'fos-router';

export default class RoutingService extends AppService {
  public static serviceName: string = 'routing';

  path(route: string, params: any = {}): string {
    // Routes are generated and imported using webpack and runtime.js file.
    return Routing.generate(route, params);
  }
}

// TOTO : OLD TODO
// TODO On en est pas ici du tout.
//      > A noter qu'on a créé un moyer récement de charger juste une vue via l'api (system_vue_entity_load)
//        et qu'il faut soit garder le système, soit l'étendre à d'autres composants.
//      > On peut aussi peut être différencier API de l'AJAX
//        - API => API Platform, liste d'assets, etc
//        - AJAX => Requètes variables, composants JS, actions success / fails
