import AbstractTest from "./AbstractTest";
import Component from '../../../js/class/Component';
import LayoutInterface from '../../../js/interfaces/RenderData/LayoutInterface';
import ModalComponent from '../../../components/modal';

export default class VariablesTest extends AbstractTest {
  public getTestMethods() {
    return [this.testVariables];
  }

  async testVariables() {
    this.assertEquals(
      this.app.layout.vars.initialLayoutVar,
      true,
      'Variable has proper value'
    );

    this.assertEquals(
      this.app.layout.page.vars.initialPageVar,
      true,
      'Initial page var is set'
    );

    this.assertTrue(
      typeof this.app.layout.page.vars.demoVariableBoolean === 'boolean',
      'Variable has proper value type'
    );

    this.assertTrue(
      typeof this.app.layout.page.vars.demoVariableInteger === 'number',
      'Variable int has proper value type'
    );

    this.assertTrue(
      typeof this.app.layout.page.vars.demoVariableFloat === 'number',
      'Variable float has proper value type'
    );

    this.assertTrue(
      typeof this.app.layout.page.vars.demoVariableObject === 'object',
      'Variable object has proper value type'
    );

    let component = this.app.layout.page.findChildRenderNodeByView(
      '@WexampleSymfonyDesignSystemBundle/components/test-component'
    ) as Component;

    this.assertTrue(
      component.vars.testComponentVar,
      'Component level var is set'
    );

    this.fetchAdaptiveAjaxPage()
      .then((renderData: LayoutInterface) => {
        this.assertEquals(
          renderData.page.vars.pageLevelTestVar,
          'value',
          'Modal renderData var is set'
        );

        this.assertEquals(
          this.app.layout.pageFocused.vars.pageLevelTestVar,
          'value',
          'Modal page level var is set'
        );

        let modal = this.app.layout.pageFocused
          .parentRenderNode as ModalComponent;
        modal.close();
      });
  }
}
