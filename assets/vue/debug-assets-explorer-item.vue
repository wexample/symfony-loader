<script>
import ExplorerItem from './explorer-item.vue';

export default {
  extends: ExplorerItem,

  props: {
    type: String,
  },

  data() {
    return {
      selected: false,
    };
  },

  methods: {
    getItemName() {
      return this.object.view;
    },

    renderItemIcon() {
      if (this.object.view === '@WexampleSymfonyLoaderBundle/components/vue') {
        return 'ph-bold ph-code';
      }

      return {
        component: 'ph-bold ph-cube',
        layout:    'ph-bold ph-monitor',
        page:      'ph-bold ph-file',
      }[this.type] ?? 'ph-bold ph-square';
    },

    getChildren() {
      const children = [];

      // The page is made after the components it stands among — `pages` waits
      // for `components` to be complete before building it — so the explorer
      // renders at least once on a layout that has none. It shows what is
      // there and redraws when the node appears, rather than handing a child
      // an object that does not exist yet.
      if (this.type === 'layout' && this.object.page) {
        children.push({ type: 'page', object: this.object.page });
      }

      (this.object.components || []).forEach((component) => {
        children.push({ type: 'component', object: component });
      });

      return children;
    },
  },
};
</script>
