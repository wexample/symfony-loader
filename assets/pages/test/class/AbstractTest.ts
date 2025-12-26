import UnitTest from '../../../js/class/UnitTest';
import LayoutInterface from "../../../js/interfaces/RenderData/LayoutInterface";

export default abstract class AbstractTest extends UnitTest {
  protected pathCoreTestAdaptive: string;

  public init() {
    this.pathCoreTestAdaptive = this.app.services.routing.path('_design_system_test_adaptive');
  }

  protected async fetchAdaptiveAjaxPage(path: string = this.pathCoreTestAdaptive): Promise<LayoutInterface> {
    return this.app.services.adaptive.get(path);
  }

  protected async fetchAdaptiveHtmlPage(path: string = this.pathCoreTestAdaptive): Promise<string> {
    return fetch(path)
      .then((response: Response) => {
        this.assertTrue(response.ok, `Fetch succeed of ${path}`);

        return response.text();
      });
  }
}
