<script>
export default {
  components: {
    'vue-test-vue-3': '@WexampleSymfonyDesignSystemBundle/vue/test-vue-3',
  },

  data() {
    return {
      testData: 'TEST_DATA_2',
      translatedStringClientSide2: this.trans('@vue::string.client_side'),
    };
  },
};
</script>
