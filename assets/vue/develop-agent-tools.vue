<script>
// What an agent is given of the page as it stands. First the page itself, as
// `inspect_page` returns it — each piece found in the page on hover, each
// action runnable from here —, then the tools, read from the registry and kept
// in step with it, each runnable with arguments written as JSON: the way to
// see what is shown, and try it, before any agent is wired.
export default {
  data() {
    return {
      tools: [],
      args: {},
      results: {},
      inspection: null,
      page: [],
      pageRaw: false,
      actionArgs: {},
      actionResults: {},
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
      this.refreshPage();
    },

    // Read again by hand too: a piece's state changes without any tool
    // coming or going.
    async refreshPage() {
      this.inspection = (await this.app?.services?.agentTools?.call('inspect_page', {})) ?? null;
      this.page = this.inspection?.nodes ?? [];
    },

    // The tree laid flat, each piece with its depth, for one list to draw.
    pageRows(nodes = this.page, depth = 0) {
      return nodes.flatMap((node) => [{ node, depth }, ...this.pageRows(node.children ?? [], depth + 1)]);
    },

    highlight(node, on) {
      this.app.services.agentTools.findNode(node.id)?.el?.classList.toggle('develop-agent-tools--highlight', on);
    },

    async act(node, action) {
      const key = `${node.id}:${action.name}`;
      let args;

      try {
        args = JSON.parse(this.actionArgs[node.id] || '{}');
      } catch (error) {
        this.actionResults = { ...this.actionResults, [node.id]: { error: `Invalid JSON: ${error.message}` } };
        return;
      }

      try {
        const value = await this.app.services.agentTools.call('act', { node: node.id, action: action.name, arguments: args });
        this.actionResults = { ...this.actionResults, [node.id]: { value: `${action.name} → ${JSON.stringify(value ?? null)}` } };
      } catch (error) {
        this.actionResults = { ...this.actionResults, [node.id]: { error: error.message } };
      }

      await this.refreshPage();
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

      await this.refreshPage();
    },
  },
};
</script>
