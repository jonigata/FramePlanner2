<script lang="ts">
  export let connector: any;
  export let disconnector: any;

  export function connect(args: any) {
    connector(args);
  }
  export function disconnect(args: any) {
    disconnector(args);
  }
</script>

<div>
  
</div>