<script>
export default {
  data() {
    return {
      currentSize: this.app?.services?.responsive?.responsiveSizeCurrent,
      windowWidth: window.innerWidth,
    };
  },

  computed: {
    breakpoints() {
      return this.app?.layout?.vars?.displayBreakpoints ?? {};
    },
  },

  mounted() {
    this._onResponsiveChange = () => {
      this.currentSize = this.app?.services?.responsive?.responsiveSizeCurrent;
      this.windowWidth = window.innerWidth;
    };

    this.app?.services?.events?.listen(
      'responsive-change-size',
      this._onResponsiveChange
    );
  },

  unmounted() {
    this.app?.services?.events?.forget(
      'responsive-change-size',
      this._onResponsiveChange
    );
  },
};
</script>
