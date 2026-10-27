<script>
// The tools an agent may call in the page as it stands, read from the
// registry and kept in step with it, each runnable from here with arguments
// written as JSON — the way to try one before any agent is wired.
export default {
  data() {
    return {
      tools: [],
      args: {},
      results: {},
    };
  },

  mounted() {
    this.refresh();
    this.stopListening = this.app?.services?.agentTools?.onChange(() => this.refresh());
  },

  beforeUnmount() {
    this.stopListening?.();
  },

  methods: {
    refresh() {
      this.tools = this.app?.services?.agentTools?.list() ?? [];
    },

    parameters(tool) {
      const properties = tool.inputSchema?.properties ?? {};
      const required = tool.inputSchema?.required ?? [];

      return Object.entries(properties).map(([name, schema]) => ({
        name,
        type: schema.enum ? schema.enum.join(' | ') : schema.type ?? 'any',
        required: required.includes(name),
      }));
    },

    hints(tool) {
      return Object.entries(tool.annotations ?? {})
        .filter(([name, value]) => name.endsWith('Hint') && value)
        .map(([name]) => name.replace(/Hint$/, ''));
    },

    async run(tool) {
      let args;

      try {
        args = JSON.parse(this.args[tool.name] || '{}');
      } catch (error) {
        this.results = { ...this.results, [tool.name]: { error: `Invalid JSON: ${error.message}` } };
        return;
      }

      try {
        const value = await this.app.services.agentTools.call(tool.name, args);
        this.results = { ...this.results, [tool.name]: { value: JSON.stringify(value ?? null) } };
      } catch (error) {
        this.results = { ...this.results, [tool.name]: { error: error.message } };
      }
    },
  },
};
</script>
