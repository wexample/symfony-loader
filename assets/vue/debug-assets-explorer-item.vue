<script>
import ExplorerItem from './explorer-item';

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

      if (this.type === 'layout') {
        children.push({ type: 'page', object: this.object.page });
      }

      this.object.components.forEach((component) => {
        children.push({ type: 'component', object: component });
      });

      return children;
    },
  },
};
</script>
