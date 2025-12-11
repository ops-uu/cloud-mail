<template>
  <div class="box">
    <div class="pass">
      <div class="title">账户与密码</div>
      <div class="pass-item">
        <div>用户名</div>
        <div>
          <span v-if="setNameShow" class="edit-name-input">
            <el-input v-model="accountName"></el-input>
            <span class="edit-name" @click="setName"> 保存 </span>
          </span>
          <span v-else class="user-name">
            <span>{{ userStore.user.name }}</span>
            <span class="edit-name" @click="showSetName"> 修改 </span>
          </span>
        </div>
      </div>
      <div class="pass-item">
        <div>邮箱</div>
        <div>{{ userStore.user.email }}</div>
      </div>
      <div class="pass-item">
        <div>密码</div>
        <div>
          <el-button type="primary" @click="pwdShow = true">修改密码</el-button>
        </div>
      </div>
    </div>

    <div class="forword-email">
      <div class="title">邮件转发</div>
      <div class="pass-item">
        <div>转发状态</div>
        <div>
          <el-dialog title="邮件转发" width="25%" v-model="setForwordEmailShow">
            <div>
              <el-form ref="form" :model="form" label-width="80px">
                <el-form-item label="转发状态:">
                  <el-radio-group v-model="emailForm.emailForward">
                    <el-radio :label="0">关闭</el-radio>
                    <el-radio :label="1">开启</el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="目标邮箱:">
                  <el-input
                    v-model="emailForm.forwardAddr"
                    placeholder="请输入邮箱，多个邮箱使用;进行分割"
                    type="textarea"
                    :rows="5"
                  ></el-input>
                </el-form-item>
              </el-form>
              <div style="display: flex; justify-content: flex-end">
                <el-button @click="setForwordEmailShow = false"
                  >取消
                </el-button>
                <el-button
                  type="primary"
                  :loading="settingLoading"
                  @click="updateForwordEmail"
                  >保存
                </el-button>
              </div>
            </div>
          </el-dialog>

          <span v-if="userStore.user.emailForward == 1">
            <el-tag key="开启" type="success" effect="dark"> 开启 </el-tag>
          </span>
          <span v-else>
            <el-tag key="关闭" type="error" effect="dark"> 关闭 </el-tag>
          </span>
          <span class="edit-forword-email" @click="showForwordEmail">
            修改
          </span>
        </div>
      </div>

      <div class="pass-item">
        <div>每日允许转发数量</div>
        <div>{{ userStore.user.forwardCount }}</div>
      </div>

      <div class="pass-item">
        <div>今日转发数量</div>
        <div>{{ userStore.user.toadyForwardCount }}</div>
      </div>

      <div class="pass-item">
        <div>转发地址</div>
        <div>
          <el-input
            :disabled="true"
            type="textarea"
            :rows="5"
            v-model="userStore.user.forwardAddr"
            style="width: 40%"
          ></el-input>
        </div>
      </div>
    </div>

    <div class="del-email" v-perm="'my:delete'">
      <div class="title">删除账户</div>
      <div style="color: #585d69">
        此操作将永久删除您的账户及其所有数据，无法恢复
      </div>
      <div>
        <el-button type="primary" @click="deleteConfirm">删除账户</el-button>
      </div>
    </div>

    <el-dialog v-model="pwdShow" title="修改密码" width="340">
      <div class="update-pwd">
        <el-input
          type="password"
          placeholder="新的密码"
          v-model="form.password"
        />
        <el-input
          type="password"
          placeholder="确认密码"
          v-model="form.newPwd"
        />
        <el-button type="primary" :loading="setPwdLoading" @click="submitPwd"
          >保存</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import { accountSetName } from "@/request/account.js";
import {
  resetPassword,
  updateForwordEmailInfo,
  userDelete,
} from "@/request/my.js";
import router from "@/router/index.js";
import { useAccountStore } from "@/store/account.js";
import { useUserStore } from "@/store/user.js";
import { defineOptions, reactive, ref } from "vue";

const accountStore = useAccountStore();
const userStore = useUserStore();
const setPwdLoading = ref(false);
const setNameShow = ref(false);
const setForwordEmailShow = ref(false);
const accountName = ref(null);
const forwordStatus = ref(null);
const forwordEmailAddr = ref(null);
const forwordEmailCount = ref(null);
const settingLoading = ref(false);

defineOptions({
  name: "setting",
});

function showSetName() {
  accountName.value = userStore.user.name;
  setNameShow.value = true;
}

function showForwordEmail() {
  emailForm.emailForward = userStore.user.emailForward;
  emailForm.forwardAddr = userStore.user.forwardAddr;
  setForwordEmailShow.value = true;
}

function setName() {
  if (!accountName.value) {
    ElMessage({
      message: "用户名不能为空",
      type: "error",
      plain: true,
    });
    return;
  }

  setNameShow.value = false;
  let name = accountName.value;

  if (name === userStore.user.name) {
    return;
  }

  userStore.user.name = accountName.value;

  accountSetName(userStore.user.accountId, name)
    .then(() => {
      ElMessage({
        message: "修改成功",
        type: "success",
        plain: true,
      });

      accountStore.changeUserAccountName = name;
    })
    .catch(() => {
      userStore.user.name = name;
    });
}

const pwdShow = ref(false);
const form = reactive({
  password: "",
  newPwd: "",
});

const deleteConfirm = () => {
  ElMessageBox.confirm("确认删除当前账号及所有数据吗?", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    userDelete().then(() => {
      localStorage.removeItem("token");
      router.replace("/login");
      ElMessage({
        message: "删除成功",
        type: "success",
        plain: true,
      });
    });
  });
};

function submitPwd() {
  if (!form.password) {
    ElMessage({
      message: "密码不能为空",
      type: "error",
      plain: true,
    });
    return;
  }

  if (form.password.length < 6) {
    ElMessage({
      message: "密码不能小于6位",
      type: "error",
      plain: true,
    });
    return;
  }

  if (form.password !== form.newPwd) {
    ElMessage({
      message: "两次密码输入不一致",
      type: "error",
      plain: true,
    });
    return;
  }

  setPwdLoading.value = true;
  resetPassword(form.password)
    .then(() => {
      ElMessage({
        message: "修改成功",
        type: "success",
        plain: true,
      });
      pwdShow.value = false;
      setPwdLoading.value = false;
      form.password = "";
      form.newPwd = "";
    })
    .catch(() => {
      setPwdLoading.value = false;
    });
}

const emailForm = reactive({
  emailForward: 0,
  forwardAddr: null,
});

function updateForwordEmail() {
  if (emailForm.emailForward == 1 && emailForm.forwardAddr == "") {
    ElMessage({
      message: "目标邮箱不能为空",
      type: "error",
      plain: true,
    });
    return;
  }
  settingLoading.value = true;
  updateForwordEmailInfo({
    emailForward: emailForm.emailForward,
    forwardAddr: emailForm.forwardAddr,
  })
    .then(() => {
      setForwordEmailShow.value = false;
      userStore.user.emailForward = emailForm.emailForward;
      userStore.user.forwardAddr = emailForm.forwardAddr;
      ElMessage({
        message: "设置成功",
        type: "success",
        plain: true,
      });
      refresh();
    })
    .finally(() => {
      settingLoading.value = false;
    });
}
</script>
<style scoped lang="scss">
.box {
  padding: 40px 40px;

  @media (max-width: 767px) {
    padding: 30px 30px;
  }

  .update-pwd {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .title {
    font-size: 18px;
    font-weight: bold;
  }

  .pass {
    font-size: 14px;
    display: grid;
    gap: 20px;
    margin-bottom: 40px;

    .pass-item {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 140px;
      position: relative;
      .user-name {
        display: grid;
        grid-template-columns: auto 1fr;
        span:first-child {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }

      .edit-name-input {
        position: absolute;
        bottom: -6px;
        .el-input {
          width: min(200px, calc(100vw - 222px));
        }
      }

      .edit-name {
        color: #4dabff;
        padding-left: 10px;
        cursor: pointer;
      }

      @media (max-width: 767px) {
        gap: 70px;
      }

      div:first-child {
        font-weight: bold;
      }

      div:last-child {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }

  .del-email {
    font-size: 14px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .forword-email {
    font-size: 14px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    .pass-item {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 140px;
      position: relative;
      .forword-email-show {
        display: grid;
        grid-template-columns: auto 1fr;
        span:first-child {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }

      .edit-name-input {
        position: absolute;
        bottom: -6px;
        .el-input {
          width: min(200px, calc(100vw - 222px));
        }
      }

      .edit-forword-email {
        color: #4dabff;
        padding-left: 10px;
        cursor: pointer;
      }

      @media (max-width: 767px) {
        gap: 70px;
      }

      div:first-child {
        font-weight: bold;
      }

      div:last-child {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }
}
</style>
