<script>
export default {
  data() {
    return {
      windowWidth: window.innerWidth,
    };
  },

  computed: {
    breakpoints() {
      return this.app?.layout?.vars?.displayBreakpoints ?? {};
    },

    currentSize() {
      let current = null;
      for (const [name, minWidth] of Object.entries(this.breakpoints)) {
        if (this.windowWidth >= minWidth) {
          current = name;
        }
      }
      return current;
    },
  },

  mounted() {
    this._onResize = () => {
      this.windowWidth = window.innerWidth;
    };
    window.addEventListener('resize', this._onResize);
  },

  unmounted() {
    window.removeEventListener('resize', this._onResize);
  },
};
</script>
