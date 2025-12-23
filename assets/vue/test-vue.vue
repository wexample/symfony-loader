<script>
export default {
  components: {
    'vue-test-vue-2': '@WexampleSymfonyDesignSystemBundle/vue/test-vue-2',
  },

  props: {
    testVuePropBool: Boolean,
    testVuePropObject: Object,
    testVuePropArray: Array,
    translations: Object,
  },

  data() {
    return {
      hidePartOfDomContainingComponent: false,
      testData: 'TEST_DATA',
      testNumber: 0,
      translatedStringClientSide: this.trans('@vue::string.client_side'),
    };
  },

  mounted() {
    document.addEventListener('test-vue-event', (data) => {
      this.testNumber++;

      this.hidePartOfDomContainingComponent =
          data.detail.hidePartOfDomContainingComponent;
    });
  },
};
</script>
