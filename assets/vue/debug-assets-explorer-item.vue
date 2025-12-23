<script>
import ExplorerItem from './explorer-item';
import { faCube } from '@fortawesome/free-solid-svg-icons/faCube';
import { faColumns } from '@fortawesome/free-solid-svg-icons/faColumns';
import { faFile } from '@fortawesome/free-solid-svg-icons/faFile';
import { faVuejs } from '@fortawesome/free-brands-svg-icons/faVuejs';

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
      let icon;

      if (this.object.view === '@WexampleSymfonyDesignSystemBundle/components/vue') {
        icon = faVuejs;
      } else {
        icon = {
          component: faCube,
          layout: faColumns,
          page: faFile,
        }[this.type];
      }

      return icon.icon[4];
    },

    getChildren() {
      let children = [];

      if (this.type === 'layout') {
        children.push({
          type: 'page',
          object: this.object.page,
        });
      }

      this.object.components.forEach((component) => {
        children.push({
          type: 'component',
          object: component,
        });
      });

      return children;
    },
  },
};
</script>
