import { Dialog } from "@headlessui/react";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BiImages } from "react-icons/bi";
import { toast } from "sonner";

import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "../../redux/slices/api/taskApiSlice";
import { dateFormatter } from "../../utils";
import { app } from "../../utils/firebase";
import Button from "../Button";
import Loading from "../Loading";
import ModalWrapper from "../ModalWrapper";
import SelectList from "../SelectList";
import Textbox from "../Textbox";
import UserList from "./UsersSelect";
import { useSelector } from "react-redux";

const LISTS = ["TODO", "IN PROGRESS", "COMPLETED"];
const PRIORIRY = ["HIGH", "MEDIUM", "NORMAL", "LOW"];

const uploadedFileURLs = [];

const uploadFile = async (file) => {
  const storage = getStorage(app);

  const name = new Date().getTime() + file.name;
  const storageRef = ref(storage, name);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        console.log("Uploading");
      },
      (error) => {
        reject(error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            uploadedFileURLs.push(downloadURL);
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      }
    );
  });
};

const AddTask = ({ open, setOpen, task }) => {
  const { user } = useSelector((state) => state.auth);
  const defaultValues = {
    title: task?.title || "",
    date: dateFormatter(task?.date || new Date()),
    reminderAt: task?.reminderAt
      ? new Date(task?.reminderAt).toISOString().slice(0, 16)
      : "",
    team: [],
    stage: "",
    priority: "",
    assets: [],
    description: "",
    links: task?.links?.join(", ") || "",
  };
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ defaultValues });

  const [stage, setStage] = useState(task?.stage?.toUpperCase() || LISTS[0]);
  const [team, setTeam] = useState(
    task?.team?.map((member) => member?._id || member) ||
      (user?._id ? [user._id] : [])
  );
  const [priority, setPriority] = useState(
    task?.priority?.toUpperCase() || PRIORIRY[1]
  );
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const URLS = task?.assets ? [...task.assets] : [];

  const handleOnSubmit = async (data) => {
    try {
      uploadedFileURLs.length = 0;

      // Validate required fields
      if (!data?.title?.trim()) {
        toast.error("Task title is required!");
        return;
      }

      if (!team || team.length === 0) {
        toast.error("Please select at least one team member.");
        return;
      }

      if (!stage) {
        toast.error("Please select a task stage.");
        return;
      }

      if (!priority) {
        toast.error("Please select a priority level.");
        return;
      }

      if (!data?.date) {
        toast.error("Please select a task date.");
        return;
      }

      // Upload files if any
      if (assets && assets.length > 0) {
        setUploading(true);
        for (const file of assets) {
          try {
            await uploadFile(file);
          } catch (error) {
            console.error("Error uploading file:", error.message);
            toast.error("Error uploading assets. Please try again.");
            setUploading(false);
            return;
          }
        }
        setUploading(false);
      }

      // Submit task
      const newData = {
        title: data.title.trim(),
        date: data.date,
        reminderAt: data.reminderAt || null,
        description: data.description || "",
        links: data.links
          ? data.links
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        assets: [...URLS, ...uploadedFileURLs],
        team,
        stage: stage.toLowerCase(),
        priority: priority.toLowerCase(),
      };

      console.log("Submitting task with data:", newData);

      const res = task?._id
        ? await updateTask({ ...newData, _id: task._id }).unwrap()
        : await createTask(newData).unwrap();

      console.log("Task created successfully:", res);
      toast.success(res?.message || "Task created successfully!");

      // Reset form and states
      reset(defaultValues);
      setTeam(user?._id ? [user._id] : []);
      setStage(LISTS[0]);
      setPriority(PRIORIRY[1]);
      setAssets([]);

      setTimeout(() => {
        setOpen(false);
      }, 500);
    } catch (err) {
      console.error("Error submitting task:", err);
      const errorMessage = err?.data?.message || err?.error || "Error submitting task";
      toast.error(errorMessage);
    }
  };

  const handleSelect = (e) => {
    setAssets(e.target.files);
  };

  return (
    <>
      <ModalWrapper open={open} setOpen={setOpen}>
        <form onSubmit={handleSubmit(handleOnSubmit)}>
          <Dialog.Title
            as='h2'
            className='text-base font-bold leading-6 text-gray-900 mb-4'
          >
            {task ? "UPDATE TASK" : "ADD TASK"}
          </Dialog.Title>

          <div className='mt-2 flex flex-col gap-6'>
            <Textbox
              placeholder='Task title'
              type='text'
              name='title'
              label='Task Title'
              className='w-full rounded'
              register={register("title", {
                required: "Title is required!",
              })}
              error={errors.title ? errors.title.message : ""}
            />
            <UserList setTeam={setTeam} team={team} />
            <div className='flex gap-4'>
              <SelectList
                label='Task Stage'
                lists={LISTS}
                selected={stage}
                setSelected={setStage}
              />
              <SelectList
                label='Priority Level'
                lists={PRIORIRY}
                selected={priority}
                setSelected={setPriority}
              />
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              <div className='w-full'>
                <Textbox
                  placeholder='Date'
                  type='date'
                  name='date'
                  label='Task Date'
                  className='w-full rounded'
                  register={register("date", {
                    required: "Date is required!",
                  })}
                  error={errors.date ? errors.date.message : ""}
                />
              </div>
              <div className='w-full'>
                <Textbox
                  placeholder='Reminder Date & Time'
                  type='datetime-local'
                  name='reminderAt'
                  label='Reminder'
                  className='w-full rounded'
                  register={register("reminderAt")}
                  error={errors.reminderAt ? errors.reminderAt.message : ""}
                />
              </div>
              <div className='w-full flex items-center justify-center mt-4'>
                <label
                  className='flex items-center gap-1 text-base text-ascent-2 hover:text-ascent-1 cursor-pointer my-4'
                  htmlFor='imgUpload'
                >
                  <input
                    type='file'
                    className='hidden'
                    id='imgUpload'
                    onChange={(e) => handleSelect(e)}
                    accept='.jpg, .png, .jpeg'
                    multiple={true}
                  />
                  <BiImages />
                  <span>Add Assets</span>
                </label>
              </div>
            </div>

            <div className='w-full'>
              <p>Task Description</p>
              <textarea
                name='description'
                {...register("description")}
                className='w-full bg-transparent px-3 py-1.5 2xl:py-3 border border-gray-300
            dark:border-gray-600 placeholder-gray-300 dark:placeholder-gray-700
            text-gray-900 dark:text-white outline-none text-base focus:ring-2
            ring-blue-300'
              ></textarea>
            </div>

            <div className='w-full'>
              <p>
                Add Links{" "}
                <span className='text- text-gray-600'>
                  seperated by comma (,)
                </span>
              </p>
              <textarea
                name='links'
                {...register("links")}
                className='w-full bg-transparent px-3 py-1.5 2xl:py-3 border border-gray-300
            dark:border-gray-600 placeholder-gray-300 dark:placeholder-gray-700
            text-gray-900 dark:text-white outline-none text-base focus:ring-2
            ring-blue-300'
              ></textarea>
            </div>
          </div>

          {isLoading || isUpdating || uploading ? (
            <div className='py-4'>
              <Loading />
            </div>
          ) : (
            <div className='bg-gray-50 mt-6 mb-4 sm:flex sm:flex-row-reverse gap-4'>
              <Button
                label='Submit'
                type='submit'
                className='bg-blue-600 px-8 text-sm font-semibold text-white hover:bg-blue-700  sm:w-auto'
              />

              <Button
                type='button'
                className='bg-white px-5 text-sm font-semibold text-gray-900 sm:w-auto'
                onClick={() => setOpen(false)}
                label='Cancel'
              />
            </div>
          )}
        </form>
      </ModalWrapper>
    </>
  );
};

export default AddTask;
