<script>
// What the user did in the page since the agent last heard from it, as the
// agent tools wrote it down (AgentUserEvents) and as the chat will send it
// with the next message: each line with when, how many times in a row, and
// what the component said. The way to see what an agent is told of the
// user's doing, before any agent is wired.
export default {
  data() {
    return {
      events: [],
    };
  },

  mounted() {
    this.refresh();
    this.stopListening = this.app?.services?.agentTools?.events.onChange(() => this.refresh());
  },

  beforeUnmount() {
    this.stopListening?.();
  },

  methods: {
    refresh() {
      this.events = [...(this.app?.services?.agentTools?.events.all() ?? [])].reverse();
    },

    clear() {
      this.app?.services?.agentTools?.events.clear();
    },

    timeOf(event) {
      return new Date(event.at).toLocaleTimeString();
    },

    detailOf(event) {
      return event.detail ? JSON.stringify(event.detail) : '';
    },
  },
};
</script>
