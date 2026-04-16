<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <h2 class="page-title">Thông báo hệ thống</h2>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-empty description="Tính năng cảnh báo tự động đang được phát triển" style="padding: 60px 0;" />
    </el-card>
  </div>
</template>

<script setup>
// placeholder
</script>

<style scoped>
.page-container {
  padding: 24px;
  background-color: var(--el-bg-color-page);
  min-height: 100vh;
}
.header-card {
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}
.table-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  margin: 0;
  font-size: var(--el-font-size-extra-large);
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>

