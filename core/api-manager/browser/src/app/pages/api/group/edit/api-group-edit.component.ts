import { Component, Input, OnInit } from '@angular/core';
import { storage, Group } from '@eoapi/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { MessageService } from '../../../../shared/services/message';
import { GroupApiDataModel, GroupTreeItem } from '../../../../shared/models';

@Component({
  selector: 'eo-api-group-edit',
  templateUrl: './api-group-edit.component.html',
  styleUrls: ['./api-group-edit.component.scss'],
})
export class ApiGroupEditComponent implements OnInit {
  @Input() group: Group;
  @Input() action?: string;
  @Input() treeItems?: any;

  validateForm!: FormGroup;
  isDelete: boolean;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private modalRef: NzModalRef,
  ) { }

  ngOnInit(): void {
    this.isDelete = this.action === 'delete';
    if (!this.isDelete) {
      const controls = { name: [null, [Validators.required]] };
      this.validateForm = this.fb.group(controls);
    }
  }

  submit(): void {
    if (!this.isDelete) {
      for (const i in this.validateForm.controls) {
        if (this.validateForm.controls.hasOwnProperty(i)) {
          this.validateForm.controls[i].markAsDirty();
          this.validateForm.controls[i].updateValueAndValidity();
        }
      }
      if (this.validateForm.status === 'INVALID') {
        return;
      }
    }
    this.save();
  }

  save(): void {
    if (this.isDelete) {
      this.delete();
    } else {
      if (this.group.uuid) {
        this.update();
      } else {
        this.create();
      }
    }
  }

  create(): void {
    storage.groupCreate(this.group).subscribe((data: Group) => {
      this.modalRef.destroy();
      this.messageService.send({ type: 'updateGroupSuccess', data: { group: data } });
    }, error => {
      console.log(error);
    });
  }

  update(): void {
    storage.groupUpdate(this.group, this.group.uuid).subscribe((data: Group) => {
      this.modalRef.destroy();
      this.messageService.send({ type: 'updateGroupSuccess', data: { group: data } });
    }, error => {
      console.log(error);
    });
  }

  /**
   * Get all child items belong to parentID
   *
   * @param list
   * @param tree
   * @param parentID
   */
  getChildrenFromTree(list: Array<GroupTreeItem>, tree: GroupApiDataModel, parentID: string): void {
    list.forEach((item) => {
      if (item.parentID === parentID) {
        if (!item.isLeaf) {
          tree.group.push(Number(item.key.replace('group-', '')));
          this.getChildrenFromTree(list, tree, item.key);
        } else {
          tree.api.push(Number(item.key));
        }
      }
    });
  }
  /**
   * Delete all tree items
   */
  delete(): void {
    const data: GroupApiDataModel = { group: [this.group.uuid], api: [] };
    this.getChildrenFromTree(this.treeItems, data, `group-${this.group.uuid}`);
    this.modalRef.destroy();
    storage.groupBulkRemove(data.group).subscribe((result) => {
      if (data.api.length) return;
      this.messageService.send({ type: 'updateGroupSuccess', data: {} });
    });
    //delete group api
    if (data.api.length > 0) {
      this.messageService.send({ type: 'gotoBulkDeleteApi', data: { uuids: data.api } });
    }
  }
}