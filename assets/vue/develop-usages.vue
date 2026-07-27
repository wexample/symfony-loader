<script>
const SKIP_USAGES = ['responsive', 'default'];

export default {
  data() {
    return {
      localUsages: {},
    };
  },

  computed: {
    visibleUsages() {
      const config = this.app?.layout?.vars?.usagesConfig ?? {};
      return Object.fromEntries(
        Object.entries(config).filter(([name]) => !SKIP_USAGES.includes(name))
      );
    },
  },

  mounted() {
    this.localUsages = { ...(this.app?.layout?.usages ?? {}) };
  },

  methods: {
    async switchUsage(usageName, usageValue) {
      await this.app.layout.setUsage(usageName, usageValue, true);
      this.localUsages = { ...this.localUsages, [usageName]: usageValue };
    },

    isActive(usageName, usageValue) {
      return this.localUsages[usageName] === usageValue;
    },

    formatLabel(name) {
      return name.replace(/_/g, ' ');
    },
  },
};
</script>
