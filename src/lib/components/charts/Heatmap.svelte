<script lang="ts">
  export let grid: number[][] = [];
  export let peak = 0;
  export let metric = 'messages';

  // German short weekday labels, grid row 0 = Monday .. 6 = Sunday.
  const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const hours = Array.from({ length: 24 }, (_, h) => h);

  function alpha(v: number): number {
    if (!peak) return 0.05;
    return 0.08 + 0.92 * (v / peak);
  }
</script>

<div class="overflow-x-auto">
  <table class="border-separate" style="border-spacing: 2px;">
    <thead>
      <tr>
        <th class="w-8"></th>
        {#each hours as h (h)}
          <th class="h-4 w-5 text-center text-[10px] font-normal text-muted-foreground">
            {h % 2 === 0 ? h : ''}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each grid ?? [] as row, d (d)}
        <tr>
          <td class="pr-1 text-right text-[11px] text-muted-foreground">{weekdays[d] ?? ''}</td>
          {#each row ?? [] as v, h (h)}
            <td
              class="h-5 w-5 rounded-sm"
              style="background: rgba(139,92,246,{alpha(v)});"
              title={`${weekdays[d] ?? ''} ${h}:00 · ${v}`}
            ></td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
