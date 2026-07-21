"use client";

import {
  useState,
  useEffect,
  useRef,
  useActionState,
  useTransition,
  useCallback,
} from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  type MenuActionState,
} from "@/app/actions/menu";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  display_order: number;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  category_id: string;
};

type ModalMode =
  | { type: "addItem"; defaultCategoryId?: string }
  | { type: "editItem"; item: MenuItem }
  | { type: "addCat" }
  | { type: "editCat"; category: Category }
  | { type: "deleteItem"; item: MenuItem }
  | { type: "deleteCat"; category: Category };

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputCls =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20";

const btnSecondary =
  "rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors";

const btnPrimary =
  "rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-zinc-950 hover:brightness-110 transition-[filter,opacity] disabled:cursor-not-allowed disabled:opacity-50";

// ─── Field Wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  required,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Category Form ────────────────────────────────────────────────────────────

function CategoryForm({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const action = category ? updateCategory : createCategory;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error === null) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="Category Name" id="name" required>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={category?.name ?? ""}
          className={inputCls}
          placeholder="e.g. Momos, Drinks, Snacks"
          autoFocus
        />
      </Field>
      <Field label="Display Order" id="display_order">
        <input
          id="display_order"
          name="display_order"
          type="number"
          min={0}
          defaultValue={category?.display_order ?? 0}
          className={inputCls}
        />
      </Field>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : category ? "Save Changes" : "Add Category"}
        </button>
      </div>
    </form>
  );
}

// ─── Item Form ────────────────────────────────────────────────────────────────

function ItemForm({
  item,
  categories,
  defaultCategoryId,
  onClose,
}: {
  item: MenuItem | null;
  categories: Category[];
  defaultCategoryId?: string;
  onClose: () => void;
}) {
  const action = item ? updateMenuItem : createMenuItem;
  const [state, formAction, pending] = useActionState(action, undefined);

  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Build/revoke an object URL preview whenever the chosen file changes.
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function handleImageFileChange(file: File | null) {
    setImageFile(file);
    // A chosen file takes priority server-side, so clear the URL field and
    // the remove flag to avoid implying more than one is in effect.
    if (file) {
      setImageUrl("");
      setImageRemoved(false);
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImageUrl("");
    setImageRemoved(true);
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  }

  const hasImage = !!imagePreview || !!imageUrl;

  useEffect(() => {
    if (state?.error === null) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <Field label="Item Name" id="name" required>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={item?.name ?? ""}
          className={inputCls}
          placeholder="e.g. Chicken Momo"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (Rs.)" id="price" required>
          <input
            id="price"
            name="price"
            type="number"
            required
            min={0}
            step="0.01"
            defaultValue={item?.price ?? ""}
            className={inputCls}
            placeholder="0.00"
          />
        </Field>
        <Field label="Display Order" id="display_order">
          <input
            id="display_order"
            name="display_order"
            type="number"
            min={0}
            defaultValue={item?.display_order ?? 0}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Category" id="category_id" required>
        <select
          id="category_id"
          name="category_id"
          required
          defaultValue={item?.category_id ?? defaultCategoryId ?? ""}
          className={inputCls}
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description" id="description">
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={item?.description ?? ""}
          className={inputCls}
          placeholder="Optional"
        />
      </Field>
      <Field label="Image" id="image_file">
        <input
          type="hidden"
          name="remove_image"
          value={imageRemoved ? "true" : "false"}
        />
        {hasImage && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview ?? imageUrl}
              alt="Item image preview"
              className="h-14 w-14 shrink-0 rounded-lg border border-zinc-200 object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Remove photo
            </button>
          </div>
        )}
        <input
          ref={imageFileInputRef}
          id="image_file"
          name="image_file"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => handleImageFileChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
        />
        <p className="text-xs text-zinc-400">
          Upload from your computer (PNG/JPEG/WebP/GIF, max 2MB), or paste a
          URL below instead.
        </p>
        <input
          id="image_url"
          name="image_url"
          type="url"
          value={imageUrl}
          disabled={!!imageFile || imageRemoved}
          onChange={(e) => {
            setImageUrl(e.target.value);
            setImageRemoved(false);
          }}
          className={`${inputCls} disabled:bg-zinc-50 disabled:text-zinc-400`}
          placeholder="https://…"
        />
      </Field>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : item ? "Save Changes" : "Add Item"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal Overlay ────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Availability Toggle ──────────────────────────────────────────────────────

function AvailabilityToggle({ item }: { item: MenuItem }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await toggleItemAvailability(item.id, !item.is_available);
        })
      }
      disabled={isPending}
      title={item.is_available ? "Mark unavailable" : "Mark available"}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${
        item.is_available ? "bg-emerald-500" : "bg-zinc-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          item.is_available ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteConfirm({
  message,
  error,
  isPending,
  onConfirm,
  onCancel,
}: {
  message: React.ReactNode;
  error: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">{message}</p>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <div className="flex items-center justify-end gap-3">
        <button onClick={onCancel} className={btnSecondary}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MenuClient({
  categories,
  items,
}: {
  categories: Category[];
  items: MenuItem[];
}) {
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closeModal = useCallback(() => setModal(null), []);

  function handleDelete(target: ModalMode) {
    setDeleteError(null);
    setModal(target);
  }

  function confirmDeleteItem(item: MenuItem) {
    startTransition(async () => {
      const result = await deleteMenuItem(item.id);
      if (result?.error) {
        setDeleteError(result.error);
      } else {
        closeModal();
      }
    });
  }

  function confirmDeleteCategory(category: Category) {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result?.error) {
        setDeleteError(result.error);
      } else {
        closeModal();
      }
    });
  }

  const categoryIds = new Set(categories.map((c) => c.id));
  const orphanedItems = items.filter((i) => !categoryIds.has(i.category_id));

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Page header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Menu Management</h1>
            <p className="text-sm text-zinc-500">
              {items.length} item{items.length !== 1 ? "s" : ""} across{" "}
              {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal({ type: "addCat" })}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              + Category
            </button>
            <button
              onClick={() => setModal({ type: "addItem" })}
              className={btnPrimary}
            >
              + Add Item
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {/* Empty state */}
        {categories.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-white py-16 text-center">
            <p className="text-base font-medium text-zinc-500">No categories yet</p>
            <p className="mt-1 text-sm text-zinc-400">
              Add a category first, then add items to it.
            </p>
            <button
              onClick={() => setModal({ type: "addCat" })}
              className={`mt-5 ${btnPrimary}`}
            >
              Add your first category
            </button>
          </div>
        )}

        {/* Category sections */}
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id);
          return (
            <div
              key={category.id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              {/* Category header row */}
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-semibold text-zinc-800">{category.name}</h2>
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-500">
                    {categoryItems.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setModal({ type: "addItem", defaultCategoryId: category.id })
                    }
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                  >
                    + Item
                  </button>
                  <button
                    onClick={() => setModal({ type: "editCat", category })}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDelete({ type: "deleteCat", category })
                    }
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Item table */}
              {categoryItems.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-zinc-400">
                  No items yet.{" "}
                  <button
                    onClick={() =>
                      setModal({ type: "addItem", defaultCategoryId: category.id })
                    }
                    className="text-zinc-600 underline underline-offset-2"
                  >
                    Add one
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      <th className="px-5 py-2.5">Name</th>
                      <th className="px-5 py-2.5">Price</th>
                      <th className="px-5 py-2.5">Available</th>
                      <th className="px-5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {categoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/60">
                        <td className="px-5 py-3">
                          <div className="font-medium text-zinc-800">{item.name}</div>
                          {item.description && (
                            <div className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-700">
                          Rs.&nbsp;{Number(item.price).toFixed(2)}
                        </td>
                        <td className="px-5 py-3">
                          <AvailabilityToggle item={item} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setModal({ type: "editItem", item })}
                              className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDelete({ type: "deleteItem", item })
                              }
                              className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        {/* Orphaned items warning */}
        {orphanedItems.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              {orphanedItems.length} item{orphanedItems.length !== 1 ? "s" : ""} belong
              to a deleted category. Edit them to reassign.
            </p>
            <ul className="mt-2 space-y-1.5">
              {orphanedItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm text-amber-700"
                >
                  <span>{item.name}</span>
                  <button
                    onClick={() => setModal({ type: "editItem", item })}
                    className="rounded px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {modal?.type === "addItem" && (
        <Modal title="Add Menu Item" onClose={closeModal}>
          <ItemForm
            item={null}
            categories={categories}
            defaultCategoryId={modal.defaultCategoryId}
            onClose={closeModal}
          />
        </Modal>
      )}

      {modal?.type === "editItem" && (
        <Modal title="Edit Menu Item" onClose={closeModal}>
          <ItemForm
            item={modal.item}
            categories={categories}
            onClose={closeModal}
          />
        </Modal>
      )}

      {modal?.type === "addCat" && (
        <Modal title="Add Category" onClose={closeModal}>
          <CategoryForm category={null} onClose={closeModal} />
        </Modal>
      )}

      {modal?.type === "editCat" && (
        <Modal title="Edit Category" onClose={closeModal}>
          <CategoryForm category={modal.category} onClose={closeModal} />
        </Modal>
      )}

      {modal?.type === "deleteItem" && (
        <Modal title="Delete Item" onClose={closeModal}>
          <DeleteConfirm
            message={
              <>
                Delete <strong>{modal.item.name}</strong>? This cannot be undone.
              </>
            }
            error={deleteError}
            isPending={isPending}
            onConfirm={() => confirmDeleteItem(modal.item)}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {modal?.type === "deleteCat" && (
        <Modal title="Delete Category" onClose={closeModal}>
          <DeleteConfirm
            message={
              <>
                Delete the <strong>{modal.category.name}</strong> category? Items in
                this category will become uncategorized.
              </>
            }
            error={deleteError}
            isPending={isPending}
            onConfirm={() => confirmDeleteCategory(modal.category)}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  );
}
