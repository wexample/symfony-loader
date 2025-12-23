<script>
export default {
  data() {
    return {
      selectedItem: null,
    };
  },

  methods: {
    selectItem(item) {
      if (this.selectedItem) {
        this.selectedItem.deselect();
      }

      item.selected = true;
      this.selectedItem = item;
    },

    deselectItem(item) {
      item.selected = false;
      this.selectedItem = null;
    },
  },
};
</script>
