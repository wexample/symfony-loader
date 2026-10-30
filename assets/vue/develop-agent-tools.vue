<script>
// What an agent is given of the page as it stands. First the page itself, as
// `inspect_page` returns it — each piece found in the page on hover, each
// action runnable from here —, then the tools, read from the registry and kept
// in step with it, each runnable with arguments written as JSON: the way to
// see what is shown, and try it, before any agent is wired.
//
// The page itself can be marked too: a frame on each component that has a
// contract, solid when the agent is shown it, dashed when it could be.
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
      overlay: false,
      boxes: [],
      selectedId: null,
    };
  },

  mounted() {
    this.refresh();
    this.stopListening = this.app?.services?.agentTools?.onChange(() => this.refresh());
  },

  beforeUnmount() {
    this.stopListening?.();
    this.unlistenViewport();
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

    toggleOverlay() {
      this.overlay = !this.overlay;

      if (this.overlay) {
        this.listenViewport();
        this.placeBoxes();
      } else {
        this.unlistenViewport();
        this.boxes = [];
      }
    },

    // The frames follow their components through scrolling and resizing,
    // once a frame.
    listenViewport() {
      this.onViewportChange = () => {
        cancelAnimationFrame(this.viewportFrame);
        this.viewportFrame = requestAnimationFrame(() => this.placeBoxes());
      };
      window.addEventListener('scroll', this.onViewportChange, true);
      window.addEventListener('resize', this.onViewportChange);
    },

    unlistenViewport() {
      if (!this.onViewportChange) {
        return;
      }

      cancelAnimationFrame(this.viewportFrame);
      window.removeEventListener('scroll', this.onViewportChange, true);
      window.removeEventListener('resize', this.onViewportChange);
      this.onViewportChange = null;
    },

    // Every component of the page that has a contract, where it stands on
    // the screen; one with no size is not drawn.
    placeBoxes() {
      const boxes = [];
      const page = this.app.services.agentTools.page();

      for (const renderNode of page.all()) {
        const status = page.statusOf(renderNode);
        const rect = status && renderNode.el.getBoundingClientRect();

        if (!rect || !(rect.width || rect.height)) {
          continue;
        }

        const node = status.exposed ? page.describe(renderNode) : null;

        boxes.push({
          id: renderNode.id,
          exposed: status.exposed,
          label: node?.label ? `${status.type} · ${node.label}` : status.type,
          detail: node
            ? node.actions.map((action) => action.name).join(', ') || 'no action'
            : 'not exposed',
          style: {
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          },
        });
      }

      this.boxes = boxes;
    },

    // A frame of the page points at its row in the list.
    select(box) {
      if (!box.exposed) {
        return;
      }

      this.selectedId = box.id;
      this.$nextTick(() => {
        this.$el.querySelector(`[data-node-id="${CSS.escape(box.id)}"]`)?.scrollIntoView({ block: 'nearest' });
      });
    },

    highlight(node, on) {
      this.app.services.agentTools.page().get(node.id)?.el?.classList.toggle('develop-agent-tools--highlight', on);
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
