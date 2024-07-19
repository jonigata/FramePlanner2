<script>
  function dragIsolator(node) {
    function handleDrag(event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    node.addEventListener('dragstart', handleDrag);
    
    return {
      destroy() {
        node.removeEventListener('dragstart', handleDrag);
      }
    };
  }
</script>

<div use:dragIsolator>
  <slot></slot>
</div>
