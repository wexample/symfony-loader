<script>
export default {
  data() {
    return {
      search: '',
    };
  },

  computed: {
    allTranslations() {
      const catalog = this.app?.layout?.translations ?? {};
      return Object.entries(catalog)
        .map(([key, value]) => ({ key, value: String(value) }))
        .sort((a, b) => a.key.localeCompare(b.key));
    },

    filteredTranslations() {
      const q = this.search.toLowerCase();
      if (!q) return this.allTranslations;
      return this.allTranslations.filter(t =>
        t.key.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)
      );
    },
  },
};
</script>
