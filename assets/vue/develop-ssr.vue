<script>
export default {
  computed: {
    layoutView() {
      return this.app?.layout?.view;
    },

    pageView() {
      return this.app?.layout?.renderData?.page?.view;
    },

    env() {
      return this.app?.layout?.renderData?.env;
    },

    renderRequestId() {
      return this.app?.layout?.renderData?.renderRequestId;
    },
  },
};
</script>
