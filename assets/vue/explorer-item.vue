<script>
export default {
  props: {
    increment: Number,
    object: Object,
    root: Object,
    updateTime: {
      required: false,
      type: Number,
    },
  },

  components: {
    'explorer-item': '@WexampleSymfonyDesignSystemBundle/vue/debug-assets-explorer-item',
  },

  data() {
    return {
      selected: false,
    };
  },

  methods: {
    getItemName() {
      return 'item';
    },

    getItemIcon() {
      return 'fa-square';
    },

    getChildren() {
      return [];
    },

    select() {
      this.root.selectItem(this);
    },

    deselect() {
      this.root.deselectItem(this);
    },
  },
};
</script>
