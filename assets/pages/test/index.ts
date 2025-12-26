import AggregationTest from './class/AggregationTest';
import AdaptiveRenderingTest from './class/AdaptiveRenderingTest';
import AppTest from './class/AppTest';
import HelperTest from './class/HelperTest';
import IconTest from './class/IconTest';
import ModalInModalTest from './class/ModalInModalTest';
import NoJsTest from './class/NoJsTest';
import OverlayTest from './class/OverlayTest';
import ResponsiveTest from './class/ResponsiveTest';
import RoutingTest from './class/RoutingTest';
import TestTest from './class/TestTest';
import TranslationTest from './class/TranslationTest';
import UsageTest from './class/UsageTest';
import VariablesTest from './class/VariablesTest';
import TestManagerPage from '../../js/class/TestManagerPage';
import LayoutTest from "./class/LayoutTest";
import VueTest from "./class/VueTest";


export default class extends TestManagerPage {
  async pageReady() {
    await this.runTests({
      AggregationTest,
      AdaptiveRenderingTest,
      AppTest,
      IconTest,
      HelperTest,
      LayoutTest,
      ModalInModalTest,
      NoJsTest,
      OverlayTest,
      RoutingTest,
      ResponsiveTest,
      TestTest,
      TranslationTest,
      UsageTest,
      VariablesTest,
      VueTest,
    });

    // Run test without aggregation.
    const location = window.location;
    if (!this.app.layout.vars.enableAggregation && !(new URLSearchParams(location.search)).get('no-test-aggregation')) {
      location.replace(
        `${location.origin}${location.pathname}?test-aggregation=1`
      );
    }
  }
}
