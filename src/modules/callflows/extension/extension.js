define(['app', 'modules/callflows/editor', 'modules/callflows/callflowUtils', 'modules/callflows/extension/extensionModel'], function (app, aceEditor, callflowUtils) {

    app.controller('CallflowExtensionCtrl', ['$scope', 'webitel', '$rootScope', 'notifi', 'CallflowExtensionModel',
        '$location', '$route', '$routeParams', '$confirm', '$window', 'TableSearch', '$timeout',
        function ($scope, webitel, $rootScope, notifi, CallflowExtensionModel, $location, $route, $routeParams, $confirm
            ,$window, TableSearch, $timeout) {
            $scope.domain = webitel.domain();
            $scope.cf = aceEditor.getStrFromJson([]);
            $scope.cfOnDisconnect = aceEditor.getStrFromJson([]);
            $scope.rowCollection = [];
            $scope.extension = {};
            $scope.isLoading = false;

            $scope.query = TableSearch.get('extensions');

            $scope.$watch("query", function (newVal) {
                TableSearch.set(newVal, 'extensions')
            });

            function initPage () {
                $scope.timeZones = callflowUtils.timeZones;
            };

            $scope.aceLoaded = aceEditor.init;

            $scope.canUpdate = webitel.connection.session.checkResource('rotes/default', 'u');

            $scope.closePage = closePage;
            $scope.edit = edit;
            $scope.save = save;
            $scope.reloadData = reloadData;


            $scope.$watch('[extension,cf,cfOnDisconnect]', function(newValue, oldValue) {
                return $scope.isEdit = !!oldValue[0]._id;
            }, true);

            $scope.cancel = function () {
                $scope.extension = angular.copy($scope.oldExtension);
                $scope.cf = angular.copy($scope.oldCf);
                $scope.cfOnDisconnect = angular.copy($scope.oldCfOnDisconnect);
                disableEditMode();
            };

            function disableEditMode () {
                $timeout(function () {
                    $scope.isEdit = false;
                }, 0);
            };


            function edit() {
                var id = $routeParams.id;
                var domain = $routeParams.domain;
                CallflowExtensionModel.item(id, domain, function (err, res) {
                    if (err)
                        return notifi.error(err);
                    $scope.extension = res;
                    $scope.oldExtension = angular.copy(res);
                    var cf = callflowUtils.replaceExpression(res.callflow);
                    var cfOnDisconnect = callflowUtils.replaceExpression(res.onDisconnect);
                    $scope.cf = aceEditor.getStrFromJson(cf);
                    $scope.cfOnDisconnect = aceEditor.getStrFromJson(cfOnDisconnect);
                    $scope.oldCf = angular.copy($scope.cf);
                    $scope.oldCfOnDisconnect = angular.copy($scope.cfOnDisconnect);
                    disableEditMode();
                });
            };

            function save() {
                try {
                    function cb (err, res) {
                        if (err)
                            return notifi.error(err);

                        $scope.extension.__time = Date.now();
                        return edit();
                    };
                    $scope.extension.callflow = JSON.parse($scope.cf);
                    if ($scope.cfOnDisconnect) {
                        $scope.extension.onDisconnect = JSON.parse($scope.cfOnDisconnect);
                    } else {
                        $scope.extension.onDisconnect = [];
                    }

                    CallflowExtensionModel.update($scope.extension, $scope.domain, cb)
                } catch (e) {
                    notifi.error(e, 3000);
                }
            };

            var changeDomainEvent = $rootScope.$on('webitel:changeDomain', function (e, domainName) {
                $scope.domain = domainName;
                closePage();
            });

            $scope.removeItem = function (row) {
                $confirm({text: 'Are you sure you want to delete ' + row.name + ' ?'},  { templateUrl: 'views/confirm.html' })
                    .then(function() {
                        CallflowExtensionModel.remove(row._id, $scope.domain, function (err) {
                            if (err)
                                return notifi.error(err, 5000);
                            reloadData()
                        })
                    });
            }

            $scope.$on('$destroy', function () {
                changeDomainEvent();
            });

            $scope.$watch('domain', function(domainName) {
                $scope.domain = domainName;
                reloadData();
            });


            function reloadData () {
                if ($location.$$path != '/callflows/extension')
                    return $scope.domain && initPage();

                if (!$scope.domain)
                    return $scope.rowCollection = [];

                $scope.isLoading = true;
                CallflowExtensionModel.list($scope.domain, function (err, res) {
                    $scope.isLoading = false;
                    if (err)
                        return notifi.error(err);
                    var arr = [];
                    angular.forEach(res, function(item) {
                        arr.push(item);
                    });
                    $scope.rowCollection = arr;
                });
            };

            function closePage () {
                $location.path('/callflows/extension');
                //$window.history.back();
            };

            $scope.init = function init () {
                if (!!$route.current.method) {
                    return $scope[$route.current.method]();
                };
            }();
        }])
});