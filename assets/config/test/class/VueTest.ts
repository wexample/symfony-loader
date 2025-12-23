import AbstractTest from "./AbstractTest";
import LayoutInterface from '../../../js/interfaces/RenderData/LayoutInterface';
import VueComponent from "../../../components/vue";

export default class VueTest extends AbstractTest {
  public getTestMethods() {
    return [
      this.testMixin
    ];
  }

  async testMixin() {
    this.fetchAdaptiveAjaxPage()
      .then((renderData: LayoutInterface) => {
        const vueComponent: VueComponent = this.app.layout.pageFocused
          .findChildRenderNodeByView('@WexampleSymfonyDesignSystemBundle/components/vue') as VueComponent;

        this.assertTrue(
          !!vueComponent,
          'The vue component exists'
        )

        this.assertTrue(
          !!vueComponent.vue,
          'The vue exist'
        )

        this.assertTrue(
          !!vueComponent.vue.app,
          'The app is registered into the global mixin of the vue'
        )
      });
  }
}
