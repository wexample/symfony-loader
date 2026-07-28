<script>
export default {
  data() {
    return {
      search: '',
    };
  },

  computed: {
    allRoutes() {
      const routing = this.app?.getService?.('routing');
      if (!routing) return [];
      const raw = routing.getRoutes();
      return Object.entries(raw)
        .map(([name, route]) => ({ name, path: this.buildPath(route) }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    filteredRoutes() {
      const q = this.search.toLowerCase();
      if (!q) return this.allRoutes;
      return this.allRoutes.filter(r =>
        r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q)
      );
    },
  },

  methods: {
    buildPath(route) {
      const tokens = route?.tokens ?? [];
      return [...tokens].reverse().map(token => {
        if (token[0] === 'text') return token[1];
        if (token[0] === 'variable') return `${token[1]}{${token[3]}}`;
        return '';
      }).join('') || '—';
    },
  },
};
</script>
