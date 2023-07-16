import { NextPage } from 'next';
import Head from 'next/head';
import { Card } from 'primereact/card';
import React, { ChangeEvent, useEffect, useReducer, useState } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';
import {
  createNewStation,
  editStationInfo,
  getStationInfo,
  getStationListFilter,
  stationLoading,
} from '../../../features/station/stationSlice';
import AddressInfo from '../../../common/components/profile/addressInfo';
import { Divider } from 'primereact/divider';
import { KeyValue } from '../../../common/config/interfaces';
import { useRouter } from 'next/router';
import {
  handleChange,
  handleChangeSelect,
  prepareAddress,
  setInputByValue,
  validateAddress,
  validateImageFile,
} from '../../../common/functions';
import StationBasicInfo from '../../../common/components/station/basicInfo';
import StationImageList from '../../../common/components/station/imageList';
import { toast } from 'react-toastify';
import {
  createNewPhoto,
  getPhotoInfo,
} from '../../../features/photo/photoSlice';
import { STATION_TYPE } from '../../../common/config/constant';

const UpdateStation: NextPage = () => {
  const dispatch = useAppDispatch();
  const stationLoadingStatus = useAppSelector(stationLoading);
  const router = useRouter();

  const keyStringAnyObj: KeyValue = {};

  const [imageKey, setImageKey] = useState(0);
  const initInput: KeyValue = {
    type: { id: 0, name: 'Ward station' },
    name: '',
    address: {
      building: '',
      detail: '',
      street: keyStringAnyObj,
      ward: keyStringAnyObj,
      district: keyStringAnyObj,
      city: keyStringAnyObj,
    },
    parentStation: keyStringAnyObj,
    wards: [],
    imageFileSelected: [],
  };

  const [inputs, setInputs] = useState(Object.assign({}, initInput));
  const [stationList, setStationList] = useState([]);
  const [errors, setErrors] = useState({
    name: '',
    address: {
      city: '',
      street: '',
      ward: '',
      district: '',
      detail: '',
    },
    wards: '',
    parentStation: '',
  });

  const handleSelectChanged = (
    val: { id: number; name: string },
    key: string,
  ) => {
    handleChangeSelect(val, key, inputs, setInputs);
  };

  function handleInputChanged(e: ChangeEvent<HTMLInputElement>) {
    handleChange(e, inputs, setInputs);
  }

  function setInput(key: string, val: any) {
    setInputByValue(key, val, setInputs);
  }

  useEffect(() => {
    const promiseList = [];
    if (router.query.id) {
      const getListStation = dispatch(
        getStationListFilter({ query: '' }),
      ).unwrap();
      promiseList.push(getListStation);
      if (router.query.id !== 'add') {
        const id = parseInt(router.query.id as string);
        if (!isNaN(id)) {
          const getStation = dispatch(getStationInfo({ id })).unwrap();
          promiseList.push(getStation);
        }
      }
    }
    Promise.all(promiseList).then((results) => {
      results.forEach((res, index) => {
        switch (index) {
          case 0:
            if (res.data) {
              setStationList(res.data.list);
            }
            break;
          case 1:
            if (res.data) {
              const stationInfo = {
                ...res.data.station,
                imageFileSelected: [],
              };
              const address = JSON.parse(JSON.stringify(stationInfo.address));
              address.city = prepareAddress(address, 'city');
              address.district = prepareAddress(address, 'district', 'city');
              address.ward = prepareAddress(address, 'ward', 'district');
              address.street = prepareAddress(address, 'street', 'ward');
              stationInfo.address = address;
              stationInfo.type = STATION_TYPE[stationInfo.type];
              stationInfo.parentStation = stationInfo.parentStation
                ? {
                    id: stationInfo.parentStation.id,
                    name: stationInfo.parentStation.name,
                    type: stationInfo.parentStation.type,
                  }
                : null;
              stationInfo.wards = stationInfo.wards.map(
                (item: { id: number; name: string }) => {
                  return {
                    id: item.id,
                    name: item.name,
                  };
                },
              );
              if (stationInfo.photos.length) {
                const promisePhoto: Array<Promise<KeyValue>> = [];
                stationInfo.photos.forEach((photo: { id: number }) => {
                  const getPhoto = dispatch(
                    getPhotoInfo({ id: photo.id }),
                  ).unwrap();
                  promisePhoto.push(getPhoto);
                });
                Promise.all(promisePhoto).then((results) => {
                  results.forEach((res, index) => {
                    if (res.isSuccess) {
                      stationInfo.imageFileSelected.push({
                        id: stationInfo.photos[index].id,
                        file: null,
                        render: URL.createObjectURL(res.data),
                      });
                    }
                  });
                  setInputs(stationInfo);
                });
              } else {
                setInputs(stationInfo);
              }
            }
            break;
          default:
            return;
        }
      });
    });
  }, [router.query]);

  async function handleSubmit() {
    if (validate()) {
      const photoList: KeyValue = [];
      for (const image of inputs.imageFileSelected) {
        if (image.file) {
          const imageRes = await handleUploadImage(image.file);
          if (imageRes.isSuccess) {
            photoList.push({
              id: imageRes.data.photoInfo.id,
            });
          }
        } else if (image.id) {
          photoList.push({
            id: image.id,
          });
        }
      }
      const dataToSend: KeyValue = {
        ...inputs,
        type: inputs.type.id,
        photos: photoList,
        parentStationId: inputs.parentStation?.id || null,
        address: {
          ...inputs.address,
          city: inputs.address.city.id ? inputs.address.city : null,
          district: inputs.address.district.id ? inputs.address.district : null,
          ward: inputs.address.ward.id ? inputs.address.ward : null,
          street: inputs.address.street.id ? inputs.address.street : null,
        },
      };
      delete dataToSend.imageFileSelected;
      let res;
      if (router.query.id !== 'add') {
        res = dispatch(editStationInfo(dataToSend)).unwrap();
      } else {
        res = dispatch(createNewStation(dataToSend)).unwrap();
      }
      res?.then((data) => {
        if (data.isSuccess) {
          toast(`Update station successfully`, {
            hideProgressBar: true,
            autoClose: 2000,
            type: 'success',
          });
        }
      });
    }
  }

  async function handleUploadImage(image: File) {
    const formData = new FormData();
    formData.append('image', image as Blob);
    return await dispatch(createNewPhoto(formData)).unwrap();
  }

  function validate() {
    let check = true;
    const errorsOld = Object.assign({}, errors);
    if (!inputs.name) {
      errorsOld.name = 'Please input name';
      check = false;
    } else {
      errorsOld.name = '';
    }

    if (inputs.type.id < 2 && inputs.parentStation.id === undefined) {
      errorsOld.parentStation = 'Please input parent station';
      check = false;
    } else {
      errorsOld.parentStation = '';
    }

    if (!inputs.wards.length) {
      errorsOld.wards = 'Please input wards under management';
      check = false;
    } else {
      errorsOld.wards = '';
    }

    const errorAddress = validateAddress(inputs.address);
    if (Object.keys(errorAddress).length) {
      errorsOld.address = {
        ...errorsOld.address,
        ...errorAddress,
      };
    }

    setErrors(errorsOld);
    return check;
  }

  function header() {
    return (
      <div className="rounded-none p-4">
        <div className="flex items-center justify-between gap-8">
          <div>
            <p className={'text-xl font-bold'}>Station</p>
            <p className={'text-sm'}>Update station info</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button
              className="flex items-center gap-3"
              severity="success"
              size="small"
              onClick={handleSubmit}
            >
              {stationLoadingStatus === 'loading' ? (
                <ProgressSpinner
                  style={{ width: '22px', height: '22px' }}
                  strokeWidth="8"
                  animationDuration="2s"
                />
              ) : (
                <>
                  <PaperAirplaneIcon strokeWidth={2} className="h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Station Info</title>
      </Head>
      <Card header={header} className="mx-auto my-5">
        <Divider align="center" className={''}>
          <span className="text-xl font-bold text-green-700">IMAGE INFO</span>
        </Divider>
        <StationImageList inputs={inputs} setInputs={setInputs} />
        <Divider align="center" className={'!mt-10'}>
          <span className="text-xl font-bold text-green-700">BASIC INFO</span>
        </Divider>
        <StationBasicInfo
          handleChange={handleInputChanged}
          inputs={inputs}
          stationList={stationList}
          setInput={setInput}
          errors={errors}
        />
        <Divider align="center" className={'!mt-10'}>
          <span className="text-xl font-bold text-green-700">ADDRESS INFO</span>
        </Divider>
        <AddressInfo
          inputs={inputs}
          errors={errors.address}
          handleChangeSelect={handleSelectChanged}
          handleChange={handleInputChanged}
        />
      </Card>
    </>
  );
};

export default UpdateStation;
